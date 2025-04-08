import { pipeline } from '@huggingface/transformers';
import { upscaleImage } from './upscaler';

// Mock the transformers pipeline function
jest.mock('@huggingface/transformers', () => ({
  pipeline: jest.fn(),
}));

describe('upscaleImage', () => {
  it('should call the upscaler pipeline with the correct model and image URL', async () => {
    const mockImageUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/anime.png';
    const mockOutput = { url: 'mock-upscaled-image.png' }; // Example output structure

    // Mock the behavior of the pipeline and the returned upscaler function
    const mockUpscaler = jest.fn().mockResolvedValue(mockOutput);
    (pipeline as jest.Mock).mockResolvedValue(mockUpscaler);

    const result = await upscaleImage(mockImageUrl);

    // Assert that pipeline was called correctly
    expect(pipeline).toHaveBeenCalledWith('image-to-image', 'Xenova/4x_APISR_GRL_GAN_generator-onnx');

    // Assert that the upscaler function returned by pipeline was called with the image URL
    expect(mockUpscaler).toHaveBeenCalledWith(mockImageUrl);

    // Assert that the function returns the expected output
    expect(result).toEqual(mockOutput);
  });

  it('should handle errors from the pipeline', async () => {
    const mockImageUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/anime.png';
    const mockError = new Error('Pipeline failed');

    // Mock the pipeline to throw an error
    (pipeline as jest.Mock).mockRejectedValue(mockError);

    await expect(upscaleImage(mockImageUrl)).rejects.toThrow(mockError);
  });

   it('should handle errors from the upscaler function', async () => {
    const mockImageUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/anime.png';
    const mockError = new Error('Upscaler failed');

    // Mock the upscaler function to throw an error
    const mockUpscaler = jest.fn().mockRejectedValue(mockError);
    (pipeline as jest.Mock).mockResolvedValue(mockUpscaler);

    await expect(upscaleImage(mockImageUrl)).rejects.toThrow(mockError);
  });
});