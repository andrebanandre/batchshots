# Tech Context

## Overview
- Project Name: batchshots
- Version: 0.1.0
- Description (from README): A powerful tool to optimize product images for SEO, with AI-powered image naming and visual optimization.

## Core Stack
- **Framework:** Next.js (^15.3.1)
- **Language:** TypeScript (^5)
- **UI Library:** React (^19.1.0)
- **Package Manager:** pnpm (inferred from lockfile)
- **Styling:** Tailwind CSS (^4.1.4) - **Note:** Implemented with a "Brutalist" aesthetic.
- **Testing:** Jest (^29.7.0)

## Key Dependencies & Services
- **Authentication:** @clerk/nextjs
- **AI (Image Naming):** @google/generative-ai (Gemini 2.0 Flash mentioned in README)
- **AI (Transformers):** @huggingface/transformers
- **Image Processing:** @imgly/background-removal, @techstark/opencv-js
-   - **OpenCV.js:** Used conditionally for client-side image adjustments (brightness, contrast, HSL, RGB, sharpen), resizing, and potentially ONNX pre/post-processing. Initialized via `initOpenCV` with Canvas fallback.
- **Payments:** @stripe/stripe-js, stripe
- **Internationalization:** next-intl
- **WebAssembly Runtime:** onnxruntime-web - **Note:** Used for client-side execution of AI models (upscaling, object removal POCs, potentially others), leveraging WebGPU/CPU. Often used in conjunction with OpenCV.js for pre/post-processing.
- **Utilities:** JSZip, UUID

## Configuration & Build
- **TypeScript:** `tsconfig.json` (ES2017 target, esnext modules, strict mode, paths alias `@/*`)
- **Next.js Config (`next.config.ts`):**
    - `reactStrictMode: true`
    - `output: 'standalone'` (for Docker)
    - `next-intl/plugin` enabled
    - Webpack customizations for WASM, ONNX Runtime, fs/path fallbacks - **Note:** Supports client-side ONNX Runtime.
    - COOP/COEP headers set (`require-corp`, `same-origin`) - **Note:** Likely needed for SharedArrayBuffer with ONNX Runtime/WASM.
- **Environment:** Requires `.env.local` (or similar) with `GOOGLE_AI_API_KEY`. Other keys (Clerk, Stripe) likely needed.
- **Docker:** Configuration exists (`docker-batchshots-core.yml`, `.dockerignore`), setup uses `standalone` Next.js output.
- **OpenCV:** Requires `opencv.js` script to be loaded (mechanism not specified, but `initOpenCV` handles readiness check).

## Scripts (`package.json`)
- `dev`: Starts development server
- `build`: Creates production build
- `start`: Starts production server
- `lint`: Runs linter (ESLint inferred)
- `test`: Runs Jest tests
- `test:watch`: Runs Jest in watch mode 