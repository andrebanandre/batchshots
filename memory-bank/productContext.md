# Product Context

## Target Audience (from projectbrief.md)
- E-commerce businesses/individuals needing to optimize product photos for web use and search engines.

## User-Facing Features (Inferred from Components)
- **Image Upload & Preview:** (`ImagePreview`)
- **Image Editing Suite:**
    - Basic Adjustments (Brightness, Contrast, etc. - inferred from `ImageProcessingControls`)
    - Background Removal (`BackgroundRemovalControl`)
    - Watermarking (`WatermarkControl`)
    - Presets (`QuickPresets`, `PresetsSelector`)
- **AI-Powered SEO Content:**
    - SEO-Optimized Filename Generation (`SeoNameGenerator`, connects to `/api/seo-names`, uses Gemini via backend)
    - SEO Product Description Generation (`SeoProductDescriptionGenerator`, connects to `/api/seo-product-description`, uses Gemini via backend)
- **Batch Processing:** Supported (mentioned in README, likely managed in UI logic).
- **Download Options:** Configurable downloads (`DownloadOptions`, `DownloadDialog`).
- **Monetization (Pro Plan):**
    - Clear indicators of Pro features/status (`ProBadge`, `UserProStatus`).
    - Upgrade prompts/dialogs (`BuyProButton`, `ProDialog`, `ProUpgradeDialog`).
    - Pricing display (`PricingCard`).
    - Likely integrates with Stripe via API routes (`/api/checkout-sessions`, `/api/webhook`, `/api/customer-portal`, `/api/check-pro-status`).
- **Internationalization:** Language selection available (`LanguageSelector`).
- **UI:** Brutalist styling (`BrutalistSelect`, Tailwind config). Core navigation (`Navbar`, `Footer`, `MobileMenu`). Standard elements (`Button`, `Card`, `Loader`).

## Key User Journeys (Examples)
1.  User uploads images -> Applies edits/presets -> Generates SEO names -> Downloads optimized images.
2.  User attempts pro feature -> Sees upgrade prompt -> Purchases pro plan via Stripe checkout -> Gains access.
3.  User manages subscription via Stripe customer portal. 