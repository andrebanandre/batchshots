# Image Enhancement Models

This directory contains ONNX models for image processing:

## UltraSharp Model
`4x-UltraSharp-fp32-opset17.onnx` - 4x image upscaling with detail enhancement

## Real-ESRGAN Model
`Real-ESRGAN-x4plus.onnx` - 4x general purpose upscaler with good photo quality

## RealWebPhoto Model
`4xRealWebPhoto_v4_fp32_opset17.onnx` - 4x photography restoration for JPEG/WEBP compression removal

## Super Resolution Model
`super-resolution-10.onnx` - A lightweight image upscaling model

## Migan Object Removal Model
`migan_pipeline_v2.onnx` - An image inpainting model that removes objects based on a user-drawn mask

These models are loaded directly from the `/public/models` directory by the application. 