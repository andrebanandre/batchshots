# System Patterns

## Architecture
- **Frontend:** Component-Based Architecture using React within the Next.js framework.
- **Backend:** Serverless functions via Next.js API Routes (`src/app/api`).
- **Styling:** Utility-first CSS with Tailwind CSS, using a "Brutalist" aesthetic. Reusable UI components located in `src/app/components`.

## Key Patterns & Flows
- **Conditional OpenCV Processing:** Core image adjustments (`imageProcessing.ts`) check if `window.cv` is loaded. If yes, use OpenCV functions (`cv.imread`, `cv.resize`, `cv.convertTo`, `cv.cvtColor`, `cv.GaussianBlur`, `cv.addWeighted`, etc.) for potentially faster/more advanced operations. If no, falls back to equivalent Canvas API implementations.
- **Client-Side AI Processing (ONNX):** ONNX models (e.g., upscaling, object removal) are executed client-side via `onnxruntime-web`.
  - **Pre-processing:** `imageHelper.ts` uses OpenCV (`cv.imread`, `cv.resize`, `cv.convertTo`) to prepare image tensors for ONNX models. POCs (`UltraSharp.tsx`) may use Canvas API directly.
  - **Post-processing:** `imageHelper.ts` converts output tensors back to images, using OpenCV conditionally for color preservation based on the original image.
  - *Note:* SEO Name/Description generation still uses Google Gemini via backend API calls.
- **API Route Integration:** Primarily for external services (Gemini, Stripe, Trends) and secure operations (payments, auth). Core image processing and ONNX AI tasks occur client-side.
  - External Service Communication (Google Gemini, Google Trends, Stripe).
  - Secure operations (Payment processing, User status checks).
- **State Management:** (TBC - Needs further analysis. Likely React Context, `useState`, or a dedicated library like Zustand/Redux).
- **Monetization Flow:** UI components (`BuyProButton`, `ProDialog`) trigger calls to `/api/checkout-sessions` (Stripe). Payment confirmation likely handled by `/api/webhook` (Stripe). User status checked via `/api/check-pro-status`. Customer portal accessed via `/api/customer-portal`.
- **Authentication:** Handled by Clerk (`@clerk/nextjs` dependency). Integration points TBC.
- **Internationalization:** Uses `next-intl`. Language switching managed by `LanguageSelector` component.
- **Watermarking & Format Conversion:** These tasks primarily use the Canvas API, even if OpenCV is available, though format conversion has an OpenCV attempt first (`imageProcessing.ts`).
- **Experimental POCs:** The `src/app/[locale]/poc` directory contains components (`UltraSharp.tsx`, `MiganObjectRemoval.tsx`) testing advanced ONNX models (upscaling, inpainting) with client-side execution. `MiganObjectRemoval.tsx` explicitly initializes OpenCV.

## Code Structure
- **Components:** Reusable UI elements in `src/app/components`.
- **API Logic:** Backend endpoints in `src/app/api`.
- **Typescript:** Strictly typed (`strict: true` in `tsconfig.json`).
- **Paths Alias:** `@/*` maps to `src/*`. 