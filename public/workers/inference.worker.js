/**
 * Single shared inference worker: hosts ALL OpenCV 5 DNN models.
 *
 * Classic worker (served statically from /workers/) so importScripts can
 * load the OpenCV 5 UMD build. One 16MB WASM parse for the whole app;
 * DNN tasks run sequentially here anyway (CPU-bound, single thread).
 *
 * Protocol (in):
 *   {type:'init'}
 *   {type:'run', task, imageId, bitmap: ImageBitmap, options?}
 *     task: 'embed'|'segment'|'detect'|'classify'|'quality'|'ocr'|'colorize'|'inpaint'
 *     options.model: override model file (e.g. u2net.onnx for HQ segment)
 *   {type:'unloadModel', model}
 *
 * Protocol (out):
 *   {status:'cv-ready'|'error', data?}
 *   {status:'model-loading', model, loadedBytes, totalBytes}
 *   {status:'model-ready', model}
 *   {status:'result', task, imageId, data}       — task-specific payload
 *   {status:'task-error', task, imageId, data}   — per-image failure
 */

/* global cv, importScripts */

importScripts('https://s3.batchshots.com/js/opencv/opencv-5.0.0.js');

const MODEL_CACHE_NAME = 'bs-models-v1';
const MODEL_BASE_URL = 'https://s3.batchshots.com/models/';

// ---------------------------------------------------------------------------
// cv runtime init (UMD may expose a thenable or a module object)
// ---------------------------------------------------------------------------
let cvReadyPromise = null;
function ensureCv() {
  if (!cvReadyPromise) {
    cvReadyPromise = (async () => {
      let cvMod = self.cv;
      if (cvMod && typeof cvMod.then === 'function') {
        // IMPORTANT: box the resolved module. The Emscripten module keeps a
        // `.then` on itself, so a bare `await cvMod` unwraps recursively and
        // hangs forever (same bug hangs Node). `.then()` once + boxing works.
        const boxed = await new Promise((resolve, reject) => {
          cvMod.then((m) => resolve({ module: m }), reject);
        });
        cvMod = boxed.module;
        try { delete cvMod.then; } catch (_) { /* sealed — fine */ }
        self.cv = cvMod;
      }
      if (typeof cvMod.imread !== 'function' && !cvMod.Mat) {
        await new Promise((resolve) => {
          cvMod.onRuntimeInitialized = resolve;
          setTimeout(resolve, 20000);
        });
      }
      if (typeof self.cv.readNetFromONNX !== 'function') {
        throw new Error('OpenCV build has no DNN module');
      }
      return self.cv;
    })();
  }
  return cvReadyPromise;
}

// ---------------------------------------------------------------------------
// Model loading (Cache API backed) — mirror of src/app/lib/modelCache.ts
// ---------------------------------------------------------------------------
const loadedNets = new Map(); // model file -> cv.dnn Net
let ocrDict = null;

async function fetchModelBytes(name) {
  const url = `${MODEL_BASE_URL}${name}`;
  let cache = null;
  try {
    cache = await caches.open(MODEL_CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  } catch (_) {
    cache = null;
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch model ${name}: HTTP ${resp.status}`);
  const totalBytes = Number(resp.headers.get('content-length')) || null;
  let bytes;
  if (resp.body) {
    const reader = resp.body.getReader();
    const chunks = [];
    let loadedBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loadedBytes += value.byteLength;
      self.postMessage({ status: 'model-loading', model: name, loadedBytes, totalBytes });
    }
    bytes = new Uint8Array(loadedBytes);
    let off = 0;
    for (const c of chunks) {
      bytes.set(c, off);
      off += c.byteLength;
    }
  } else {
    bytes = new Uint8Array(await resp.arrayBuffer());
  }
  if (cache) {
    try {
      await cache.put(url, new Response(bytes.slice().buffer, {
        headers: { 'Content-Type': 'application/octet-stream' },
      }));
    } catch (_) { /* quota — ignore */ }
  }
  return bytes;
}

async function getNet(modelFile) {
  if (loadedNets.has(modelFile)) return loadedNets.get(modelFile);
  await ensureCv();
  const bytes = await fetchModelBytes(modelFile);
  const fsName = `m_${modelFile}`;
  try { cv.FS_unlink('/' + fsName); } catch (_) { /* not present */ }
  cv.FS_createDataFile('/', fsName, bytes, true, false, false);
  const net = cv.readNetFromONNX(fsName);
  try { cv.FS_unlink('/' + fsName); } catch (_) { /* keep FS clean */ }
  loadedNets.set(modelFile, net);
  self.postMessage({ status: 'model-ready', model: modelFile });
  return net;
}

function unloadModel(modelFile) {
  const net = loadedNets.get(modelFile);
  if (net) {
    try { net.delete(); } catch (_) { /* already gone */ }
    loadedNets.delete(modelFile);
  }
}

async function getOcrDict() {
  if (!ocrDict) {
    const resp = await fetch(`${MODEL_BASE_URL}ppocr_keys_v1.txt`);
    if (!resp.ok) throw new Error('Failed to fetch OCR dictionary');
    const text = await resp.text();
    ocrDict = text.split('\n').map((l) => l.replace(/\r$/, ''));
  }
  return ocrDict;
}

// ---------------------------------------------------------------------------
// Mat helpers
// ---------------------------------------------------------------------------

/** ImageBitmap -> RGB cv.Mat (caller must .delete()). Optionally max-side resize. */
function bitmapToRgbMat(bitmap, maxSide) {
  let { width, height } = bitmap;
  if (maxSide && Math.max(width, height) > maxSide) {
    const scale = maxSide / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const rgba = cv.matFromImageData(imageData);
  const rgb = new cv.Mat();
  cv.cvtColor(rgba, rgb, cv.COLOR_RGBA2RGB);
  rgba.delete();
  return rgb;
}

/** Per-channel (x - mean)/std normalization applied in-place to an NCHW float blob. */
function normalizeBlobChannels(blob, mean, std) {
  const data = blob.data32F;
  const channelSize = data.length / 3;
  for (let c = 0; c < 3; c++) {
    const m = mean[c];
    const s = std[c];
    const base = c * channelSize;
    for (let i = 0; i < channelSize; i++) {
      data[base + i] = (data[base + i] - m) / s;
    }
  }
}

function blobShape(mat) {
  const dims = [];
  for (let i = 0; i < mat.dims; i++) dims.push(mat.matSize[i]);
  return dims;
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

/** DINOv2 embeddings: 224x224, ImageNet norm, returns Float32Array (CLS). */
async function taskEmbed(bitmap, options) {
  const net = await getNet(options.model || 'dinov2-small.onnx');
  const src = bitmapToRgbMat(bitmap);
  let blob = null;
  let out = null;
  try {
    blob = cv.blobFromImage(src, 1 / 255, new cv.Size(224, 224), new cv.Scalar(0, 0, 0), true, false);
    normalizeBlobChannels(blob, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
    net.setInput(blob);
    out = net.forward();
    // Output (1, 257, 384) tokens or (1, 384) pooled — take CLS (first dim floats).
    // NOTE: this cv build reports rows/cols=-1 for N-D Mats, so shapes are
    // derived from data length + known model geometry, not from the Mat.
    const data = out.data32F;
    const dim = options.embedDim || 384;
    if (data.length % dim !== 0) {
      throw new Error(`Unexpected embed output length ${data.length} for dim ${dim}`);
    }
    return { embedding: Float32Array.from(data.subarray(0, dim)), dim };
  } finally {
    src.delete();
    if (blob) blob.delete();
    if (out) out.delete();
  }
}

/** u2netp/u2net saliency mask. Returns mask (Float32Array 0..1) at 320x320. */
async function taskSegment(bitmap, options) {
  const net = await getNet(options.model || 'u2netp.onnx');
  const src = bitmapToRgbMat(bitmap);
  let blob = null;
  let out = null;
  try {
    blob = cv.blobFromImage(src, 1 / 255, new cv.Size(320, 320), new cv.Scalar(0, 0, 0), true, false);
    // u2net was trained with ImageNet-ish normalization
    normalizeBlobChannels(blob, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
    net.setInput(blob);
    out = net.forward();
    const data = out.data32F;
    // Output (1,1,320,320); N-D Mat shape is unreadable in this build, but
    // the model's first output plane is square at the input resolution.
    const side = Math.round(Math.sqrt(data.length));
    const w = side * side === data.length ? side : 320;
    const h = w;
    const size = w * h;
    // Min-max normalize to 0..1
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < size; i++) {
      const v = data[i];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;
    const mask = new Float32Array(size);
    for (let i = 0; i < size; i++) mask[i] = (data[i] - min) / range;
    return { mask, maskWidth: w, maskHeight: h };
  } finally {
    src.delete();
    if (blob) blob.delete();
    if (out) out.delete();
  }
}

/** YOLOv8n detection. Returns boxes in ORIGINAL bitmap coordinates. */
async function taskDetect(bitmap, options) {
  const net = await getNet(options.model || 'yolov8n.onnx');
  const inputSize = 640;
  const origW = bitmap.width;
  const origH = bitmap.height;
  // Letterbox
  const scale = Math.min(inputSize / origW, inputSize / origH);
  const scaledW = Math.round(origW * scale);
  const scaledH = Math.round(origH * scale);
  const padX = (inputSize - scaledW) / 2;
  const padY = (inputSize - scaledH) / 2;
  const canvas = new OffscreenCanvas(inputSize, inputSize);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#727272';
  ctx.fillRect(0, 0, inputSize, inputSize);
  ctx.drawImage(bitmap, padX, padY, scaledW, scaledH);
  const imageData = ctx.getImageData(0, 0, inputSize, inputSize);
  const rgba = cv.matFromImageData(imageData);
  const src = new cv.Mat();
  cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);
  rgba.delete();

  let blob = null;
  let out = null;
  try {
    blob = cv.blobFromImage(src, 1 / 255, new cv.Size(inputSize, inputSize), new cv.Scalar(0, 0, 0), true, false);
    net.setInput(blob);
    out = net.forward();
    const data = out.data32F;
    // Output (1, 84, 8400) for COCO YOLOv8; derive from data length since
    // N-D Mat shape is unreadable in this build.
    const numAttrs = options.numAttrs || 84;
    if (data.length % numAttrs !== 0) {
      throw new Error(`Unexpected detect output length ${data.length}`);
    }
    const numBoxes = data.length / numAttrs;
    const numClasses = numAttrs - 4;

    const confThreshold = options.confThreshold ?? 0.25;
    const candidates = [];
    for (let i = 0; i < numBoxes; i++) {
      let bestScore = 0;
      let bestClass = -1;
      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numBoxes + i];
        if (score > bestScore) {
          bestScore = score;
          bestClass = c;
        }
      }
      if (bestScore < confThreshold) continue;
      const cx = data[0 * numBoxes + i];
      const cy = data[1 * numBoxes + i];
      const w = data[2 * numBoxes + i];
      const h = data[3 * numBoxes + i];
      candidates.push({
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        score: bestScore,
        classId: bestClass,
      });
    }

    // JS NMS (avoids RectVector binding juggling)
    candidates.sort((a, b) => b.score - a.score);
    const iouThreshold = options.iouThreshold ?? 0.45;
    const kept = [];
    for (const cand of candidates) {
      let keep = true;
      for (const k of kept) {
        const x1 = Math.max(cand.x, k.x);
        const y1 = Math.max(cand.y, k.y);
        const x2 = Math.min(cand.x + cand.w, k.x + k.w);
        const y2 = Math.min(cand.y + cand.h, k.y + k.h);
        const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const union = cand.w * cand.h + k.w * k.h - inter;
        if (union > 0 && inter / union > iouThreshold) {
          keep = false;
          break;
        }
      }
      if (keep) kept.push(cand);
      if (kept.length >= (options.maxDetections ?? 20)) break;
    }

    // Map back to original coordinates
    const boxes = kept.map((b) => ({
      x: Math.max(0, (b.x - padX) / scale),
      y: Math.max(0, (b.y - padY) / scale),
      w: Math.min(origW, b.w / scale),
      h: Math.min(origH, b.h / scale),
      score: b.score,
      classId: b.classId,
    }));
    return { boxes };
  } finally {
    src.delete();
    if (blob) blob.delete();
    if (out) out.delete();
  }
}

/** MobileNetV2 ImageNet classification. Returns top-k [{classId, score}]. */
async function taskClassify(bitmap, options) {
  const net = await getNet(options.model || 'mobilenetv2.onnx');
  const src = bitmapToRgbMat(bitmap);
  let blob = null;
  let out = null;
  try {
    blob = cv.blobFromImage(src, 1 / 255, new cv.Size(224, 224), new cv.Scalar(0, 0, 0), true, false);
    normalizeBlobChannels(blob, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
    net.setInput(blob);
    out = net.forward();
    const logits = out.data32F;
    // Softmax
    let maxLogit = -Infinity;
    for (let i = 0; i < logits.length; i++) if (logits[i] > maxLogit) maxLogit = logits[i];
    let sum = 0;
    const exps = new Float32Array(logits.length);
    for (let i = 0; i < logits.length; i++) {
      exps[i] = Math.exp(logits[i] - maxLogit);
      sum += exps[i];
    }
    const k = options.topK ?? 5;
    const indexed = Array.from(exps, (v, i) => ({ classId: i, score: v / sum }));
    indexed.sort((a, b) => b.score - a.score);
    return { topK: indexed.slice(0, k) };
  } finally {
    src.delete();
    if (blob) blob.delete();
    if (out) out.delete();
  }
}

/** Classical quality metrics: blur (Laplacian variance), brightness, clipping. */
async function taskQuality(bitmap) {
  await ensureCv();
  // Downscale for speed — metrics are scale-tolerant
  const src = bitmapToRgbMat(bitmap, 512);
  const gray = new cv.Mat();
  const lap = new cv.Mat();
  const mean = new cv.Mat();
  const stddev = new cv.Mat();
  try {
    cv.cvtColor(src, gray, cv.COLOR_RGB2GRAY);
    cv.Laplacian(gray, lap, cv.CV_64F);
    cv.meanStdDev(lap, mean, stddev);
    const blurVariance = stddev.data64F
      ? stddev.data64F[0] * stddev.data64F[0]
      : Math.pow(stddev.doubleAt ? stddev.doubleAt(0, 0) : 0, 2);

    // Brightness + clipping from gray histogram (manual — trivial loop)
    const data = gray.data;
    let sum = 0;
    let dark = 0;
    let bright = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
      if (data[i] <= 8) dark++;
      else if (data[i] >= 247) bright++;
    }
    const brightnessMean = sum / data.length;
    return {
      blurVariance,
      brightnessMean,
      clippedShadowsPct: (dark / data.length) * 100,
      clippedHighlightsPct: (bright / data.length) * 100,
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    src.delete();
    gray.delete();
    lap.delete();
    mean.delete();
    stddev.delete();
  }
}

/** PP-OCR: det (DB) -> boxes -> rec (CRNN) -> CTC greedy decode. */
async function taskOcr(bitmap, options) {
  const detNet = await getNet(options.detModel || 'ppocr-det.onnx');
  const recNet = await getNet(options.recModel || 'ppocr-rec.onnx');
  const dict = await getOcrDict();

  // --- Detection ---
  // Resize longest side to <=736, dims multiple of 32
  const maxSide = 736;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const detW = Math.max(32, Math.round((bitmap.width * scale) / 32) * 32);
  const detH = Math.max(32, Math.round((bitmap.height * scale) / 32) * 32);
  const canvas = new OffscreenCanvas(detW, detH);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, detW, detH);
  const imageData = ctx.getImageData(0, 0, detW, detH);
  const rgba = cv.matFromImageData(imageData);
  const src = new cv.Mat();
  cv.cvtColor(rgba, src, cv.COLOR_RGBA2RGB);
  rgba.delete();

  const texts = [];
  const recognized = [];
  let blob = null;
  let out = null;
  let probMat = null;
  let binMat = null;
  let contours = null;
  let hierarchy = null;
  try {
    blob = cv.blobFromImage(src, 1 / 255, new cv.Size(detW, detH), new cv.Scalar(0, 0, 0), true, false);
    normalizeBlobChannels(blob, [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]);
    detNet.setInput(blob);
    out = detNet.forward(); // (1,1,H,W) probability map — same H/W as the input blob
    const mapH = detH;
    const mapW = detW;

    // Threshold prob map -> binary mask -> contours -> boxes
    probMat = cv.matFromArray(mapH, mapW, cv.CV_32FC1, out.data32F.subarray(0, mapH * mapW));
    binMat = new cv.Mat();
    cv.threshold(probMat, binMat, options.detThreshold ?? 0.3, 255, cv.THRESH_BINARY);
    const bin8 = new cv.Mat();
    binMat.convertTo(bin8, cv.CV_8U);
    contours = new cv.MatVector();
    hierarchy = new cv.Mat();
    cv.findContours(bin8, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    bin8.delete();

    const scaleX = bitmap.width / mapW;
    const scaleY = bitmap.height / mapH;
    const boxes = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const rect = cv.boundingRect(contour);
      contour.delete();
      if (rect.width < 4 || rect.height < 4) continue;
      // Pad box by 30% of height (DB shrinks text regions)
      const pad = Math.round(rect.height * 0.3);
      boxes.push({
        x: Math.max(0, Math.round(rect.x * scaleX) - pad),
        y: Math.max(0, Math.round(rect.y * scaleY) - pad),
        w: Math.min(bitmap.width, Math.round(rect.width * scaleX) + 2 * pad),
        h: Math.min(bitmap.height, Math.round(rect.height * scaleY) + 2 * pad),
      });
    }
    // Read order: top-to-bottom, left-to-right
    boxes.sort((a, b) => (a.y - b.y) || (a.x - b.x));

    // --- Recognition per box ---
    for (const box of boxes.slice(0, options.maxBoxes ?? 20)) {
      const recH = 48;
      const recWMax = 320;
      const targetW = Math.min(recWMax, Math.max(16, Math.round((box.w / box.h) * recH)));
      const recCanvas = new OffscreenCanvas(recWMax, recH);
      const recCtx = recCanvas.getContext('2d', { willReadFrequently: true });
      recCtx.fillStyle = '#000000';
      recCtx.fillRect(0, 0, recWMax, recH);
      recCtx.drawImage(bitmap, box.x, box.y, box.w, box.h, 0, 0, targetW, recH);
      const recData = recCtx.getImageData(0, 0, recWMax, recH);
      const recRgba = cv.matFromImageData(recData);
      const recRgb = new cv.Mat();
      cv.cvtColor(recRgba, recRgb, cv.COLOR_RGBA2RGB);
      recRgba.delete();
      let recBlob = null;
      let recOut = null;
      try {
        recBlob = cv.blobFromImage(recRgb, 1 / 127.5, new cv.Size(recWMax, recH), new cv.Scalar(127.5, 127.5, 127.5), true, false);
        recNet.setInput(recBlob);
        recOut = recNet.forward(); // (1, T, C)
        const logits = recOut.data32F;
        // C = dict size + blank (+ optional space slot); pick the candidate
        // that divides the output evenly.
        let C = dict.length + 1;
        if (logits.length % C !== 0 && logits.length % (dict.length + 2) === 0) {
          C = dict.length + 2;
        }
        if (logits.length % C !== 0) {
          throw new Error(`Unexpected rec output length ${logits.length} for dict ${dict.length}`);
        }
        const T = logits.length / C;
        // CTC greedy decode: argmax per step, collapse repeats, skip blank (index 0)
        let text = '';
        let prev = -1;
        for (let t = 0; t < T; t++) {
          let best = 0;
          let bestIdx = 0;
          for (let c = 0; c < C; c++) {
            const v = logits[t * C + c];
            if (v > best) {
              best = v;
              bestIdx = c;
            }
          }
          if (bestIdx !== 0 && bestIdx !== prev) {
            // dict is 1-indexed relative to blank at 0
            const ch = dict[bestIdx - 1];
            if (ch !== undefined) text += ch;
          }
          prev = bestIdx;
        }
        if (text.trim().length > 0) {
          const clean = text.trim();
          texts.push(clean);
          recognized.push({ text: clean, box });
        }
      } finally {
        recRgb.delete();
        if (recBlob) recBlob.delete();
        if (recOut) recOut.delete();
      }
    }
    const heights = recognized.map((item) => item.box.h).sort((a, b) => a - b);
    const medianHeight = heights.length ? heights[Math.floor(heights.length / 2)] : 0;
    const markdown = recognized
      .map(({ text, box }) => {
        const looksLikeHeading =
          medianHeight > 0 && box.h >= medianHeight * 1.45 && text.length <= 100;
        return looksLikeHeading ? `## ${text}` : text;
      })
      .join('\n\n');
    return { texts, joined: texts.join('\n'), markdown };
  } finally {
    src.delete();
    if (blob) blob.delete();
    if (out) out.delete();
    if (probMat) probMat.delete();
    if (binMat) binMat.delete();
    if (contours) contours.delete();
    if (hierarchy) hierarchy.delete();
  }
}

/**
 * Zhang et al. siggraph17 colorization. Model I/O is fixed at 1x1x256x256
 * (L channel, real Lab scale 0..100 — normalization is baked into the graph) ->
 * 1x2x256x256 (ab channels, real Lab scale ~-110..110, also baked in — no
 * extra scaling needed on either side). ab is resized back to the original
 * image size and merged with the original full-res L channel before
 * converting back to RGB. Returns a full-size RGBA pixel buffer.
 */
async function taskColorize(bitmap, options) {
  const net = await getNet(options.model || 'colorizer.onnx');
  const src = bitmapToRgbMat(bitmap); // CV_8UC3 RGB, original size
  const origW = src.cols;
  const origH = src.rows;

  let srcF = null;
  let lab = null;
  let planes = null;
  let lFull = null;
  let aOrig = null;
  let bOrig = null;
  let lResized = null;
  let blob = null;
  let out = null;
  let aPlane = null;
  let bPlane = null;
  let abVec = null;
  let abMat = null;
  let abResized = null;
  let abPlanes = null;
  let aResized = null;
  let bResized = null;
  let labVec = null;
  let labFull = null;
  let rgbFull = null;
  let rgb8 = null;
  let rgba = null;
  try {
    // RGB -> Lab in float (real Lab ranges: L 0..100, a/b roughly -127..127).
    // Must convert on a CV_32F Mat — 8U Lab conversion rescales to 0..255.
    srcF = new cv.Mat();
    src.convertTo(srcF, cv.CV_32FC3, 1 / 255);
    lab = new cv.Mat();
    cv.cvtColor(srcF, lab, cv.COLOR_RGB2Lab);

    planes = new cv.MatVector();
    cv.split(lab, planes);
    lFull = planes.get(0); // CV_32FC1, original size, real L 0..100 — kept
    aOrig = planes.get(1);
    bOrig = planes.get(2);

    lResized = new cv.Mat();
    cv.resize(lFull, lResized, new cv.Size(256, 256), 0, 0, cv.INTER_LINEAR);

    // scale=1, mean=0: model expects raw L (0..100), normalization is baked
    // into the ONNX graph (Sub 50 / Div 100 on the input tensor).
    blob = cv.blobFromImage(lResized, 1, new cv.Size(256, 256), new cv.Scalar(0, 0, 0, 0), false, false);
    net.setInput(blob);
    out = net.forward();
    const data = out.data32F;
    // Output (1,2,256,256); N-D Mat shape is unreadable in this build, but
    // the model has a fixed input/output geometry (256x256, 2 channels).
    const planeSize = 256 * 256;
    if (data.length !== 2 * planeSize) {
      throw new Error(`Unexpected colorize output length ${data.length}`);
    }
    aPlane = cv.matFromArray(256, 256, cv.CV_32FC1, data.subarray(0, planeSize));
    bPlane = cv.matFromArray(256, 256, cv.CV_32FC1, data.subarray(planeSize, 2 * planeSize));
    abVec = new cv.MatVector();
    abVec.push_back(aPlane);
    abVec.push_back(bPlane);
    abMat = new cv.Mat();
    cv.merge(abVec, abMat);

    abResized = new cv.Mat();
    cv.resize(abMat, abResized, new cv.Size(origW, origH), 0, 0, cv.INTER_LINEAR);

    abPlanes = new cv.MatVector();
    cv.split(abResized, abPlanes);
    aResized = abPlanes.get(0);
    bResized = abPlanes.get(1);

    labVec = new cv.MatVector();
    labVec.push_back(lFull);
    labVec.push_back(aResized);
    labVec.push_back(bResized);
    labFull = new cv.Mat();
    cv.merge(labVec, labFull);

    rgbFull = new cv.Mat();
    cv.cvtColor(labFull, rgbFull, cv.COLOR_Lab2RGB); // still float, ~0..1 (clamped by convertTo below)

    rgb8 = new cv.Mat();
    rgbFull.convertTo(rgb8, cv.CV_8UC3, 255);

    rgba = new cv.Mat();
    cv.cvtColor(rgb8, rgba, cv.COLOR_RGB2RGBA);

    const pixels = new Uint8ClampedArray(rgba.data);
    return { pixels, width: origW, height: origH };
  } finally {
    src.delete();
    if (srcF) srcF.delete();
    if (lab) lab.delete();
    if (aOrig) aOrig.delete();
    if (bOrig) bOrig.delete();
    if (lFull) lFull.delete();
    if (planes) planes.delete();
    if (lResized) lResized.delete();
    if (blob) blob.delete();
    if (out) out.delete();
    if (aPlane) aPlane.delete();
    if (bPlane) bPlane.delete();
    if (abVec) abVec.delete();
    if (abMat) abMat.delete();
    if (abResized) abResized.delete();
    if (aResized) aResized.delete();
    if (bResized) bResized.delete();
    if (abPlanes) abPlanes.delete();
    if (labVec) labVec.delete();
    if (labFull) labFull.delete();
    if (rgbFull) rgbFull.delete();
    if (rgb8) rgb8.delete();
    if (rgba) rgba.delete();
  }
}

/**
 * Object removal via classical inpainting (cv.inpaint / Telea). NOTE: this is
 * NOT latent-diffusion inpainting — those models are far too large/slow to
 * run on a browser CPU. Telea fills the masked region by propagating nearby
 * texture/color inward; good for small-to-medium objects on relatively flat
 * backgrounds, not generative content synthesis. Revisit if a small enough
 * diffusion inpainting ONNX model ever becomes practical for this build.
 *
 * options: { mask: Uint8Array (0/255), maskWidth, maskHeight }
 */
async function taskInpaint(bitmap, options) {
  await ensureCv();
  const src = bitmapToRgbMat(bitmap);
  const origW = src.cols;
  const origH = src.rows;

  let maskSrc = null;
  let mask = null;
  let dilated = null;
  let kernel = null;
  let dst = null;
  let rgba = null;
  try {
    const maskWidth = options.maskWidth;
    const maskHeight = options.maskHeight;
    const maskData = options.mask;
    if (!maskData || !maskWidth || !maskHeight) {
      throw new Error('inpaint requires options.mask/maskWidth/maskHeight');
    }
    maskSrc = cv.matFromArray(maskHeight, maskWidth, cv.CV_8UC1, maskData);

    if (maskWidth !== origW || maskHeight !== origH) {
      mask = new cv.Mat();
      cv.resize(maskSrc, mask, new cv.Size(origW, origH), 0, 0, cv.INTER_LINEAR);
      // Resize can introduce intermediate gray values along edges — rethreshold.
      cv.threshold(mask, mask, 127, 255, cv.THRESH_BINARY);
    } else {
      mask = maskSrc;
      maskSrc = null;
    }

    // Dilate the mask a few px so inpainting covers stroke edges/anti-aliasing.
    // Some minimal OpenCV WASM builds may omit getStructuringElement/dilate —
    // check at runtime and skip gracefully if unavailable.
    if (typeof cv.getStructuringElement === 'function' && typeof cv.dilate === 'function') {
      try {
        kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(17, 17)); // ~8px radius
        dilated = new cv.Mat();
        cv.dilate(mask, dilated, kernel);
      } catch (_) {
        dilated = null;
      }
    }
    const inpaintMask = dilated || mask;

    dst = new cv.Mat();
    cv.inpaint(src, inpaintMask, dst, 3, cv.INPAINT_TELEA);

    rgba = new cv.Mat();
    cv.cvtColor(dst, rgba, cv.COLOR_RGB2RGBA);
    const pixels = new Uint8ClampedArray(rgba.data);
    return { pixels, width: origW, height: origH };
  } finally {
    src.delete();
    if (maskSrc) maskSrc.delete();
    if (mask) mask.delete();
    if (dilated) dilated.delete();
    if (kernel) kernel.delete();
    if (dst) dst.delete();
    if (rgba) rgba.delete();
  }
}

const TASKS = {
  embed: taskEmbed,
  segment: taskSegment,
  detect: taskDetect,
  classify: taskClassify,
  quality: taskQuality,
  ocr: taskOcr,
  colorize: taskColorize,
  inpaint: taskInpaint,
};

// ---------------------------------------------------------------------------
// Message loop — tasks run sequentially via a promise chain
// ---------------------------------------------------------------------------
let taskChain = Promise.resolve();

self.onmessage = (event) => {
  const { type, task, imageId, requestId, bitmap, options = {}, model } = event.data;

  if (type === 'init') {
    ensureCv()
      .then(() => self.postMessage({ status: 'cv-ready' }))
      .catch((e) => self.postMessage({ status: 'error', data: e.message || String(e) }));
    return;
  }

  if (type === 'unloadModel') {
    unloadModel(model);
    return;
  }

  if (type === 'run') {
    const fn = TASKS[task];
    if (!fn) {
      self.postMessage({ status: 'task-error', task, imageId, requestId, data: `Unknown task: ${task}` });
      return;
    }
    taskChain = taskChain.then(async () => {
      try {
        await ensureCv();
        const data = await fn(bitmap, options);
        // Transfer embedding/mask buffers back where possible
        const transfers = [];
        if (data && data.embedding) transfers.push(data.embedding.buffer);
        if (data && data.mask) transfers.push(data.mask.buffer);
        if (data && data.pixels) transfers.push(data.pixels.buffer);
        self.postMessage({ status: 'result', task, imageId, requestId, data }, transfers);
      } catch (e) {
        const msg = e && e.message ? e.message : (typeof e === 'number' ? `wasm exception #${e}` : String(e));
        self.postMessage({ status: 'task-error', task, imageId, requestId, data: msg });
      } finally {
        if (bitmap && typeof bitmap.close === 'function') bitmap.close();
      }
    });
  }
};
