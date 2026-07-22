# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Batch Shots (package name `batchshots`, live at www.batchshots.com) is a browser-only batch marketplace photo editor. **All image processing and ML inference runs client-side** — no backend; the app is exported as a fully static site (`output: "export"`). All DNN inference runs through **OpenCV 5's DNN module** (`cv.readNetFromONNX`, CPU/WASM single-thread) — there is no onnxruntime-web or transformers.js.

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Static export to out/, then next-sitemap (postbuild)
npm run start        # Serve the exported out/ directory on :3000
npm run lint         # eslint src (flat config; next lint was removed in Next 16)
npm test             # Jest (ts-jest + jsdom)
npx jest path/to/file.test.ts       # Run a single test file
npx jest -t "name substring"        # Run tests matching a name
```

Node 24.3.0 / npm 11.4.2 pinned in engines. CI: lint → build → test.

## Architecture

**Static export + i18n.** Every page lives under `src/app/[locale]/`; locales `en, de, nl, fr, pl, cs, ru, uk` (default `en`) in `src/i18n/routing.ts`, strings in `messages/<locale>.json`. Use navigation wrappers from `src/i18n/navigation.ts`, not raw `next/navigation`. New pages need: a namespace in **all 8** message files, a `layout.tsx` with `generateMetadata` + 8-locale `alternates`, and `setRequestLocale`. The root layout is bare; the real layout is `src/app/[locale]/layout.tsx`.

**The pipeline is the flagship** (`/pipeline`): upload up to 500 images → Dedupe → Background removal → Auto-crop → Quality check → OCR (skipped by default) → Caption/rename → Resize/compress → Export ZIP. Steps can be skipped/jumped; re-running a step invalidates downstream artifacts (confirm dialog).

- `src/app/types/pipeline.ts` — `PipelineItem` (blob URLs, never base64; grids render `thumbUrl` only), `StepId`, `STEP_ORDER`, artifact keys.
- `src/app/lib/pipelineReducer.ts` — pure session reducer (unit-tested) incl. `INVALIDATE_FROM` semantics; `src/app/contexts/PipelineContext.tsx` wraps it.
- `src/app/lib/steps/registry.ts` — pure step metadata (routes, i18n namespace, `produces` keys that drive invalidation). `src/app/lib/navigation.ts` derives the nav menus from it (Navbar + MobileMenu are data-driven).
- `src/app/components/steps/` — one panel per step + `useStepRunner.ts` (shared batching/progress/status/invalidation hook). `StepStandalone.tsx` renders any step on its own SEO URL with a scoped session.
- Standalone tool URLs render pipeline step panels: `/background-removal` (bg), `/ai-photo-duplicate-finder` (dedupe), `/ai-image-seo-caption-generation` (caption), `/product-photo-cropper`, `/photo-quality-checker`, `/image-text-extraction`. **Legacy pages kept as-is**: `/` (homepage adjustments editor), `/add-watermark`, `/image-format-convertor`.

**Inference: one shared classic Web Worker** — `public/workers/inference.worker.js` (plain JS, served statically; `importScripts` the OpenCV UMD; do NOT convert to a module worker). Hosts all models; tasks: `embed` (DINOv2), `segment` (u2netp/u2net), `detect` (YOLOv8n + JS NMS), `classify` (MobileNetV2), `quality` (classical), `ocr` (PP-OCR det+rec + CTC decode). Typed client: `src/app/lib/inferenceClient.ts` (promise per request, transfers ImageBitmaps). Models are lazy-fetched directly from `https://s3.batchshots.com/models/` and cached via Cache API (`bs-models-v1` — bump on model change; mirrored logic in `modelCache.ts` and inside the worker).

**OpenCV 5** build with DNN: `https://s3.batchshots.com/js/opencv/opencv-5.0.0.js` (16MB UMD, single-threaded — REQUIRED, static export has no COOP/COEP so SharedArrayBuffer is unavailable). Loaded on the main thread by `public/js/opencv-loader.js` and directly in the inference worker (CORS enabled); the loader dispatches `opencv-ready`. Types in `src/app/lib/opencv.d.ts`. **Loading this build in Node hangs — verify models in a real browser** via the permanent dev harness `/[locale]/model-check` (noindex, sitemap-excluded).

**Pure logic libs** (all unit-tested, no DOM): `phash.ts` (DCT pHash), `similarity.ts` (cosine + union-find grouping), `qualityRules.ts` (flag thresholds), `colorName.ts` (k-means dominant color), `captionTemplates.ts` (template captions — VLM captioning was removed deliberately), `batchQueue.ts`, `marketplacePresets.ts`. Canvas ops in `imageOps.ts` (mask compositing, crop/pad/square, resize/encode, target-size search); ingest (EXIF-rotate via `createImageBitmap({imageOrientation:'from-image'})`, metadata strip, thumbnails) in `ingest.ts`.

**Legacy editor** (`src/app/[locale]/page.tsx`, homepage): brightness/HSL/watermark/presets via `lib/imageProcessing.ts` (canvas primary, main-thread OpenCV optional). Uses the old base64 `ImageFile` model — do not extend it; new work goes through `PipelineItem`.

## Constraints & gotchas

- Model assets are hosted on Cloudflare R2 at `https://s3.batchshots.com/models/`; `modelCache.ts getModel(name, onProgress, baseUrl)` supports overriding that base URL. They are not bundled in `public/`.
- u2net (HQ bg removal) is ~18s/image on CPU — always opt-in; u2netp is the default.
- Worker Mats must be `.delete()`d (try/finally); blob URLs must be revoked when replaced (`revokeItem`/`revokeArtifacts` in types/pipeline.ts).
- `react-hooks/set-state-in-effect` and `static-components` are downgraded to warnings in `eslint.config.mjs` for pre-existing code — fix when touching those files.
- E2E: Playwright scripts drive `/en/pipeline` headless (see scratchpad patterns); Chrome extension automation is unavailable in this environment.
