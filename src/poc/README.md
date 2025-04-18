<!-- # Image Enhancement POC

This is a proof of concept for image upscaling/enhancement using an ONNX model with WebGPU acceleration.

## Setup

1. Obtain the ONNX model file:
   - The component is configured to look for a file named `4x-UltraSharp-fp16-opset17.onnx`
   - Place this file in the `/public/models/` directory

2. Make sure you have the required dependencies:
   - onnxruntime-web
   - @huggingface/transformers (optional, for additional model loading capabilities)

## Usage

1. Upload an image using the file picker
2. Click the "Enhance Image" button
3. The enhanced result will be displayed in the right canvas

## Technical Details

- The model is loaded and run using ONNX Runtime with WebGPU acceleration
- The image preprocessing is currently simplified for demonstration purposes
- The actual pre/post-processing should be tailored to the specific model requirements

## Troubleshooting

- WebGPU is a new technology and requires a compatible browser (Chrome 113+ or Edge 113+)
- For large models, you may need to increase memory limits in the ONNX runtime configuration
- Check browser console for detailed error messages  -->