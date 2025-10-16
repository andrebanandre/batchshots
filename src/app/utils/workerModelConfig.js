/**
 * Model configuration selector for Web Workers
 * Provides optimal model configurations based on device capabilities
 */

import { getDeviceResourceTier } from './workerDeviceDetector.js';

/**
 * Model configuration presets for different resource tiers
 */
const FASTVLM_CONFIGS = {
  // Ultra-low (mobile): Absolute smallest browser-compatible configuration
  // Total: ~282 MB (decoder_q4f16) + 272 MB (embed_q4f16) + 253 MB (vision_q4f16) = ~807 MB
  // NOTE: int8/uint8/quantized variants use ConvInteger ops NOT supported in browser
  // bnb4 variants are larger in some cases, q4f16 is the smallest COMPATIBLE option
  'ultra-low': {
    embed_tokens: 'q4f16',        // 272 MB - 4-bit quantized with fp16 (browser-safe)
    vision_encoder: 'q4f16',      // 253 MB - 4-bit quantized with fp16 (browser-safe)
    decoder_model_merged: 'q4f16', // 282 MB - 4-bit quantized with fp16 (browser-safe)
  },

  // Low-end: Same as ultra-low for now (smallest stable models)
  // Total: ~282 MB (decoder) + 272 MB (embed) + 253 MB (vision) = ~807 MB
  low: {
    embed_tokens: 'q4f16',        // 272 MB - 4-bit quantized with fp16 output
    vision_encoder: 'q4f16',      // 253 MB - 4-bit quantized with fp16 output
    decoder_model_merged: 'q4f16', // 282 MB - 4-bit quantized with fp16 output
  },

  // Medium: Balanced quality/size (q4 with fp16 embed)
  // Total: ~317 MB (decoder) + 272 MB (embed) + 253 MB (vision) = ~842 MB
  medium: {
    embed_tokens: 'fp16',          // 272 MB - good quality, small enough
    vision_encoder: 'q4f16',       // 253 MB - 4-bit quantized with fp16 output
    decoder_model_merged: 'q4',    // 317 MB - 4-bit quantized
  },

  // High-end: Best quality (fp16 variants)
  // Total: ~992 MB (decoder) + 272 MB (embed) + 253 MB (vision) = ~1.5 GB
  high: {
    embed_tokens: 'fp16',          // 272 MB
    vision_encoder: 'fp16',        // 253 MB - full fp16 quality
    decoder_model_merged: 'fp16',  // 992 MB - full fp16 quality
  },
};

/**
 * Gets the optimal FastVLM model configuration based on device capabilities
 * @returns {Promise<{embed_tokens: string, vision_encoder: string, decoder_model_merged: string}>}
 */
export async function getFastVLMConfig() {
  const tier = await getDeviceResourceTier();
  return FASTVLM_CONFIGS[tier];
}

/**
 * Gets model configuration for a specific resource tier
 * @param {'ultra-low'|'low'|'medium'|'high'} tier - Resource tier
 * @returns {{embed_tokens: string, vision_encoder: string, decoder_model_merged: string}}
 */
export function getFastVLMConfigForTier(tier) {
  return FASTVLM_CONFIGS[tier] || FASTVLM_CONFIGS.low;
}

/**
 * Estimates total model size in MB for a given configuration
 * @param {{embed_tokens: string, vision_encoder: string, decoder_model_merged: string}} config
 * @returns {number} Estimated size in MB
 */
export function estimateModelSize(config) {
  const sizes = {
    // Embed tokens sizes
    'fp16': 272,
    'q4f16': 272,
    'q4': 544,
    'int8': 136,
    'uint8': 136,
    'bnb4': 544,
    'quantized': 136,

    // Vision encoder sizes
    'vision_fp16': 253,
    'vision_q4f16': 253,
    'vision_q4': 505,
    'vision_int8': 223,
    'vision_uint8': 223,
    'vision_bnb4': 505,
    'vision_quantized': 223,

    // Decoder sizes
    'decoder_fp16': 992,
    'decoder_q4f16': 282,
    'decoder_q4': 317,
    'decoder_int8': 503,
    'decoder_uint8': 503,
    'decoder_bnb4': 287,
    'decoder_quantized': 503,
  };

  const embedSize = sizes[config.embed_tokens] || 272;
  const visionSize = sizes[`vision_${config.vision_encoder}`] || 253;
  const decoderSize = sizes[`decoder_${config.decoder_model_merged}`] || 317;

  return embedSize + visionSize + decoderSize;
}

/**
 * Generic model configuration helper for other transformers models
 * @param {string} modelId - Hugging Face model ID
 * @param {'low'|'medium'|'high'} [tier] - Optional resource tier (auto-detected if not provided)
 * @returns {Promise<{dtype?: string, device?: string, quantized?: boolean}>}
 */
export async function getGenericModelConfig(modelId, tier = null) {
  const resourceTier = tier || await getDeviceResourceTier();

  const configs = {
    low: {
      dtype: 'q4',           // 4-bit quantization
      quantized: true,
    },
    medium: {
      dtype: 'q8',           // 8-bit quantization
      quantized: true,
    },
    high: {
      dtype: 'fp16',         // Full fp16 precision
      quantized: false,
    },
  };

  return configs[resourceTier];
}

/**
 * Export configuration presets for external use
 */
export { FASTVLM_CONFIGS };
