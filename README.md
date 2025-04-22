# Batch Shots: SEO Image Optimizer

[![CI](https://github.com/username/picme/actions/workflows/ci.yml/badge.svg)](https://github.com/username/picme/actions/workflows/ci.yml)
[![Tests](https://github.com/username/picme/actions/workflows/test.yml/badge.svg)](https://github.com/username/picme/actions/workflows/test.yml)

A powerful tool to optimize product images for SEO, with AI-powered image naming and visual optimization.

## Features

- **Image Processing**: Adjust brightness, contrast, sharpness, and colors
- **Image Optimization**: Resize and compress images with presets
- **AI SEO Image Naming**: Generate SEO-friendly filenames using Google's Gemini 2.0 Flash AI
- **Google Trends Integration**: Incorporate trending keywords into filenames
- **Batch Processing**: Process up to 10 images at once
- **Download Options**: Download optimized images in various formats

## AI-Powered SEO Image Naming with Gemini

This application leverages Google's Gemini 2.0 Flash model to generate SEO-friendly image names for your product images. The AI analyzes your product descriptions and uses Google Trends data to create filenames optimized for search engines.

### How it works:

1. Enter a detailed product description
2. The app analyzes your description to identify relevant categories
3. Google Trends data is used to find trending keywords related to your product
4. Gemini AI generates SEO-optimized filenames incorporating your description and trending keywords
5. You can edit individual filenames as needed
6. Download images with the new AI-generated SEO-friendly names

## Structured JSON Output

The application uses Gemini AI's responseSchema capability to ensure properly structured output. This implementation:

1. Uses the SchemaType enum from the official Google Generative AI SDK
2. Defines a precise schema with an array of strings for consistent output
3. Generates structured JSON responses with proper validation
4. Ensures reliable and consistent SEO filename generation

Code example of the structured output implementation:

```typescript
// Request with responseSchema for structured output
const request: GenerateContentRequest = {
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: {
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    responseMimeType: 'application/json',
    responseSchema: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.STRING,
        description: 'SEO-friendly image filename',
      },
      description: 'Array of 10 SEO-friendly image filenames',
    },
  },
  // Safety settings and other configurations...
};
```

This approach leverages Gemini's advanced structured output capabilities to create consistent, reliable SEO-friendly image names.

## Setup

1. Clone this repository
2. Run `npm install` to install dependencies
3. Create a `.env.local` file based on `.env.local.example` and add your Google AI API key
4. Run `npm run dev` to start the development server
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Create a `.env.local` file with the following variables:

```
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

You can obtain a Google AI API key from the [Google AI Studio](https://makersuite.google.com/).

## Technologies Used

- Next.js and React for the frontend
- Tailwind CSS for styling
- OpenCV.js for image processing
- Google Gemini 2.0 Flash AI for SEO name generation
- Google Trends data for keyword optimization
- Structured JSON output for consistent naming

## License

MIT
