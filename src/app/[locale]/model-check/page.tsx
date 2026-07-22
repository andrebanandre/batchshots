'use client';

/**
 * Dev-only OpenCV 5 DNN model compatibility harness.
 *
 * For each model in S3: fetch → readNetFromONNX (via Emscripten FS)
 * → blobFromImage on a synthetic test image → setInput → forward → report
 * output shape + timing. Kept permanently as a debugging tool (noindex).
 */

import React, { useCallback, useEffect, useState } from 'react';

interface ModelSpec {
  name: string;
  file: string;
  inputWidth: number;
  inputHeight: number;
  scale: number; // scalefactor for blobFromImage
  mean: [number, number, number];
  swapRB: boolean;
  notes: string;
  /** Grayscale (single-channel L) input instead of the default 3-channel RGB. */
  channels?: 1 | 3;
}

const MODELS: ModelSpec[] = [
  {
    name: 'u2netp (bg removal, fast)',
    file: 'u2netp.onnx',
    inputWidth: 320,
    inputHeight: 320,
    scale: 1 / 255,
    mean: [0, 0, 0],
    swapRB: true,
    notes: '1x3x320x320 → saliency mask',
  },
  {
    name: 'u2net (bg removal, quality)',
    file: 'u2net.onnx',
    inputWidth: 320,
    inputHeight: 320,
    scale: 1 / 255,
    mean: [0, 0, 0],
    swapRB: true,
    notes: '1x3x320x320 → saliency mask',
  },
  {
    name: 'YOLOv8n (detection)',
    file: 'yolov8n.onnx',
    inputWidth: 640,
    inputHeight: 640,
    scale: 1 / 255,
    mean: [0, 0, 0],
    swapRB: true,
    notes: '1x3x640x640 → (1,84,8400)',
  },
  {
    name: 'DINOv2-small (embeddings)',
    file: 'dinov2-small.onnx',
    inputWidth: 224,
    inputHeight: 224,
    scale: 1 / 255,
    mean: [123.675 / 255, 116.28 / 255, 103.53 / 255],
    swapRB: true,
    notes: '1x3x224x224 → 384-d CLS (ImageNet norm; std applied ad-hoc, check README)',
  },
  {
    name: 'PP-OCRv3 det',
    file: 'ppocr-det.onnx',
    inputWidth: 736,
    inputHeight: 736,
    scale: 1 / 255,
    mean: [0.485, 0.456, 0.406],
    swapRB: true,
    notes: '1x3x736x736 → prob map',
  },
  {
    name: 'PP-OCRv3 rec (CRNN)',
    file: 'ppocr-rec.onnx',
    inputWidth: 320,
    inputHeight: 48,
    scale: 1 / 127.5,
    mean: [127.5 / 255, 127.5 / 255, 127.5 / 255],
    swapRB: true,
    notes: '1x3x48x320 → CTC logits',
  },
  {
    name: 'MobileNetV2 (classify)',
    file: 'mobilenetv2.onnx',
    inputWidth: 224,
    inputHeight: 224,
    scale: 1 / 255,
    mean: [0.485, 0.456, 0.406],
    swapRB: true,
    notes: '1x3x224x224 → 1000 logits',
  },
  {
    name: 'ConvNeXt-Tiny (classify, HQ)',
    file: 'classifier-hq.onnx',
    inputWidth: 224,
    inputHeight: 224,
    scale: 1 / 255,
    mean: [0.485, 0.456, 0.406],
    swapRB: true,
    notes: '1x3x224x224 → 1000 logits (timm convnext_tiny.fb_in1k)',
  },
  {
    name: 'Colorizer (siggraph17)',
    file: 'colorizer.onnx',
    inputWidth: 256,
    inputHeight: 256,
    scale: 1,
    mean: [0, 0, 0],
    swapRB: false,
    notes: '1x1x256x256 (L, real 0..100 scale) → 1x2x256x256 (ab, real Lab scale)',
    channels: 1,
  },
];

interface CheckResult {
  file: string;
  status: 'pending' | 'running' | 'pass' | 'fail' | 'missing';
  fetchMs?: number;
  loadMs?: number;
  inferMs?: number;
  sizeMB?: string;
  outputShape?: string;
  error?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function getCv(): any {
  return typeof window !== 'undefined' ? (window as any).cv : undefined;
}

function makeTestImageData(width: number, height: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  // Gradient + shapes so the net sees non-trivial input
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#ff8800');
  grad.addColorStop(1, '#0044ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.min(width, height) / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.font = `${Math.max(12, height / 10)}px sans-serif`;
  ctx.fillText('TEST 123', width / 8, height / 8 + 20);
  return ctx.getImageData(0, 0, width, height);
}

function matShape(cv: any, mat: any): string {
  try {
    if (mat.dims > 2 && mat.matSize) {
      const dims: number[] = [];
      for (let i = 0; i < mat.dims; i++) dims.push(mat.matSize[i]);
      return `[${dims.join('×')}]`;
    }
    return `[${mat.rows}×${mat.cols}] (ch=${mat.channels()})`;
  } catch {
    return 'unknown';
  }
}

async function checkModel(spec: ModelSpec): Promise<CheckResult> {
  const cv = getCv();
  const result: CheckResult = { file: spec.file, status: 'running' };

  // 1. Fetch model bytes
  const t0 = performance.now();
  const resp = await fetch(`https://s3.batchshots.com/models/${spec.file}`);
  if (!resp.ok) {
    return { ...result, status: 'missing', error: `HTTP ${resp.status} — file not available from R2` };
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  result.fetchMs = Math.round(performance.now() - t0);
  result.sizeMB = (buf.byteLength / (1024 * 1024)).toFixed(1);

  const fsName = `check_${spec.file}`;
  let net: any = null;
  let src: any = null;
  let blob: any = null;
  let out: any = null;
  try {
    // 2. Load via Emscripten FS → readNetFromONNX
    const t1 = performance.now();
    try {
      cv.FS_unlink(fsName);
    } catch {
      /* not present — fine */
    }
    cv.FS_createDataFile('/', fsName, buf, true, false, false);
    net = cv.readNetFromONNX(fsName);
    result.loadMs = Math.round(performance.now() - t1);

    // 3. Synthetic input → blob → forward
    const imageData = makeTestImageData(spec.inputWidth, spec.inputHeight);
    src = cv.matFromImageData(imageData);
    const rgb = new cv.Mat();
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    let inputMat = rgb;
    if (spec.channels === 1) {
      const gray = new cv.Mat();
      cv.cvtColor(rgb, gray, cv.COLOR_RGB2GRAY);
      rgb.delete();
      inputMat = gray;
    }
    blob = cv.blobFromImage(
      inputMat,
      spec.scale,
      new cv.Size(spec.inputWidth, spec.inputHeight),
      new cv.Scalar(spec.mean[0], spec.mean[1], spec.mean[2]),
      spec.swapRB,
      false
    );
    inputMat.delete();
    net.setInput(blob);
    const t2 = performance.now();
    out = net.forward();
    result.inferMs = Math.round(performance.now() - t2);
    result.outputShape = matShape(cv, out);
    result.status = 'pass';
  } catch (e) {
    result.status = 'fail';
    result.error = e instanceof Error ? e.message : String(e);
  } finally {
    try {
      out?.delete();
      blob?.delete();
      src?.delete();
      net?.delete();
      cv.FS_unlink(fsName);
    } catch {
      /* cleanup best-effort */
    }
  }
  return result;
}

export default function ModelCheckPage() {
  const [cvReady, setCvReady] = useState(false);
  const [cvInfo, setCvInfo] = useState('waiting for OpenCV…');
  const [results, setResults] = useState<CheckResult[]>(
    MODELS.map((m) => ({ file: m.file, status: 'pending' }))
  );
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const check = () => {
      const cv = getCv();
      if (cv && typeof cv.imread === 'function') {
        const hasDnn = typeof cv.readNetFromONNX === 'function';
        const hasBlob = typeof cv.blobFromImage === 'function';
        setCvInfo(
          `OpenCV loaded. DNN: readNetFromONNX=${hasDnn} blobFromImage=${hasBlob} ` +
            `build=${typeof cv.getBuildInformation === 'function' ? 'info available' : 'n/a'}`
        );
        setCvReady(hasDnn && hasBlob);
        return true;
      }
      return false;
    };
    if (check()) return;
    const onReady = () => check();
    window.addEventListener('opencv-ready', onReady);
    const poll = setInterval(() => check() && clearInterval(poll), 500);
    return () => {
      window.removeEventListener('opencv-ready', onReady);
      clearInterval(poll);
    };
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    for (let i = 0; i < MODELS.length; i++) {
      setResults((prev) => prev.map((r, j) => (j === i ? { ...r, status: 'running' } : r)));
      // Yield to render before heavy work
      await new Promise((res) => setTimeout(res, 50));
      const result = await checkModel(MODELS[i]);
      setResults((prev) => prev.map((r, j) => (j === i ? result : r)));
    }
    setRunning(false);
  }, []);

  const statusColor: Record<CheckResult['status'], string> = {
    pending: 'bg-gray-200',
    running: 'bg-yellow-300',
    pass: 'bg-green-400',
    fail: 'bg-red-400',
    missing: 'bg-orange-300',
  };

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="brutalist-accent-card mb-8 p-6">
        <h1 className="text-2xl font-bold uppercase mb-2">OpenCV 5 DNN Model Check (dev)</h1>
        <p className="text-sm mb-4 font-mono">{cvInfo}</p>
        <button
          className="brutalist-border px-4 py-2 font-bold bg-white disabled:opacity-50"
          disabled={!cvReady || running}
          onClick={runAll}
        >
          {running ? 'Running…' : 'Run all checks'}
        </button>

        <table className="w-full mt-6 text-sm">
          <thead>
            <tr className="text-left border-b-2 border-black">
              <th className="py-2">Model</th>
              <th>Status</th>
              <th>Size</th>
              <th>Load</th>
              <th>Infer</th>
              <th>Output</th>
            </tr>
          </thead>
          <tbody>
            {MODELS.map((m, i) => {
              const r = results[i];
              return (
                <tr key={m.file} className="border-b border-gray-300 align-top">
                  <td className="py-2 pr-2">
                    <div className="font-bold">{m.name}</div>
                    <div className="font-mono text-xs text-gray-600">
                      {m.file} — {m.notes}
                    </div>
                    {r.error && <div className="text-xs text-red-700 font-mono mt-1">{r.error}</div>}
                  </td>
                  <td>
                    <span className={`px-2 py-1 font-mono text-xs ${statusColor[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="font-mono">{r.sizeMB ? `${r.sizeMB}MB` : '—'}</td>
                  <td className="font-mono">{r.loadMs != null ? `${r.loadMs}ms` : '—'}</td>
                  <td className="font-mono">{r.inferMs != null ? `${r.inferMs}ms` : '—'}</td>
                  <td className="font-mono">{r.outputShape ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
