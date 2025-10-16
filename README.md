# Batch Shots: AI-Powered Image Processing Toolkit

<div style="text-align: center;">
  <a href="https://www.batchshots.com" target="_blank" rel="noopener noreferrer">
    <img src="https://www.batchshots.com/logo.svg" alt="Batch Shots Logo" width="160" height="auto" style="margin-right: -100px;">
  </a>
  <a href="https://www.batchshots.com" target="_blank" rel="noopener noreferrer">
    <h1 style="font-size: 2.5em; margin: 0; font-weight: bold; text-transform: uppercase;">batchshots.com</h1>
</a>
</div>


[![CI](https://github.com/andrebanandre/batchshots/actions/workflows/ci.yml/badge.svg)](https://github.com/andrebanandre/batchshots/actions/workflows/ci.yml)

A comprehensive suite of AI-powered image processing tools designed for photographers, content creators, and businesses.
Process, optimize, and enhance images with advanced AI capabilities including duplicate detection, background removal,
SEO optimization, and more.

## 🛠️ Tools & Features

### 🎨 Image Optimizer (Main Tool)

- **Advanced Image Processing**: Adjust brightness, contrast, sharpness, saturation, and colors
- **Smart Presets**: Pre-configured optimization settings for different use cases
- **Watermark Support**: Add custom watermarks to protect your images
- **Batch Processing**: Process up to 100 images simultaneously
- **Multiple Formats**: Export in JPG, PNG, WEBP, and other formats
- **SEO-Friendly Naming**: Generate optimized filenames for better search visibility

### 🔍 AI Photo Duplicate Finder

- **Smart Similarity Detection**: Multiple algorithms (Cosine, Euclidean, Manhattan Distance)
- **Vision Transformer Technology**: Uses advanced ViT embeddings for accurate detection
- **Quality Analysis**: Automatically identifies the best image in duplicate groups
- **Real-time Threshold Adjustment**: Fine-tune similarity settings without re-uploading
- **Batch Download**: Download only the highest quality images from each group
- **Mobile Optimized**: Efficient processing on all devices

### 🎭 Background Removal

- **AI-Powered Removal**: Advanced segmentation using deep learning models
- **Precise Cutouts**: Clean removal of backgrounds with fine detail preservation
- **Batch Processing**: Remove backgrounds from multiple images at once
- **Quality Control**: Maintain image quality and resolution
- **Multiple Formats**: Support for JPG, PNG, WEBP, HEIC, and more

### 📝 AI Image SEO Caption Generation

- **Automated Captioning**: Generate descriptive captions for images using AI
- **SEO Optimization**: Create search-friendly image descriptions
- **Batch Processing**: Generate captions for multiple images simultaneously
- **Customizable Output**: Adjust caption style and length
- **Multi-language Support**: Generate captions in multiple languages

### 🖼️ Add Watermark

- **Custom Watermarking**: Add text or image watermarks to protect your content
- **Flexible Positioning**: Place watermarks anywhere on the image
- **Opacity Control**: Adjust watermark transparency
- **Batch Application**: Apply watermarks to multiple images at once
- **Text & Image Support**: Use text or upload custom watermark images

### 🔄 Image Format Converter

- **Universal Conversion**: Convert between all major image formats
- **Quality Preservation**: Maintain image quality during conversion
- **Batch Conversion**: Convert multiple images simultaneously
- **HEIC Support**: Convert Apple's HEIC format to standard formats
- **Compression Options**: Optimize file sizes during conversion

### 🌍 Multi-Language Support

- **8 Languages**: English, German, Dutch, French, Polish, Czech, Russian, Ukrainian
- **Localized Interface**: Complete UI translation for all supported languages
- **SEO Localization**: Multi-language SEO optimization

## 🚀 Getting Started

### Prerequisites

- Node.js 24.3.0 or later
- npm 11.4.2 or later

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/batchshots.git
   cd batchshots
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the development server**

   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Build for production
npm run build

# Serve the static build
npm start
```

The application is configured for static export, making it easy to deploy to any static hosting service like Vercel,
Netlify, or GitHub Pages.

## 🛠️ Technologies & AI Models

### Core Technologies

- **Next.js 15** - React framework with static export for optimal performance
- **React 19** - Modern React with latest features and optimizations
- **TypeScript** - Type-safe development across the entire codebase
- **Tailwind CSS 4** - Utility-first CSS framework for responsive design
- **OpenCV.js** - Computer vision library for advanced image processing

### AI & Machine Learning

- **Hugging Face Transformers** - State-of-the-art NLP and vision models
- **ONNX Runtime** - High-performance inference engine for AI models
- **Vision Transformers (ViT)** - Advanced computer vision for image analysis
- **UMAP** - Dimensionality reduction for embedding visualization

### Image Processing & Optimization

- **Sharp** - High-performance image processing (server-side)
- **HEIC-to** - Apple HEIC/HEIF format conversion
- **JSZip** - Client-side ZIP file creation for batch downloads
- **Three.js** - 3D graphics for advanced visualizations

### Internationalization & SEO

- **Next-intl** - Complete internationalization solution
- **Next-sitemap** - Automated sitemap generation with multi-language support
- **PostHog** - Privacy-focused analytics and user tracking

### Development & Testing

- **Jest** - Comprehensive testing framework
- **ESLint** - Code linting and quality assurance
- **Webpack** - Advanced bundling with custom configurations

## 🔗 Connect

- **Twitter/X:** [@andre_banandre](https://x.com/andre_banandre)
- **GitHub:** [@andrebanandre](https://github.com/andrebanandre)
- **LinkedIn:** [Andrii Fedorenko](https://www.linkedin.com/in/andrii-fedorenko-65905863/)

---

## 📄 License

MIT
