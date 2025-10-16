/**
 * Device resource detection utility for Web Workers
 * Detects device capabilities to optimize model loading
 */

/**
 * Detects available device memory (in GB)
 * @returns {number} Estimated device memory in GB (defaults to 4 if unavailable)
 */
export function getDeviceMemory() {
  // navigator.deviceMemory is only available in some browsers
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    return navigator.deviceMemory || 4;
  }

  // Default to 4GB for unknown devices
  return 4;
}

/**
 * Detects hardware concurrency (number of logical processors)
 * @returns {number} Number of logical processors
 */
export function getHardwareConcurrency() {
  if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
    return navigator.hardwareConcurrency || 4;
  }
  return 4;
}

/**
 * Checks if the device is likely a mobile device
 * @returns {boolean} True if device is mobile
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Also check for touch capability and screen size
  const isTouchDevice = 'ontouchstart' in self || navigator.maxTouchPoints > 0;
  const isSmallScreen = typeof screen !== 'undefined' && screen.width < 768;

  return isMobileUA || (isTouchDevice && isSmallScreen);
}

/**
 * Checks WebGPU availability
 * @returns {Promise<boolean>} True if WebGPU is available
 */
export async function checkWebGPU() {
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Determines device resource tier
 * @returns {Promise<'ultra-low'|'low'|'medium'|'high'>} Resource tier
 */
export async function getDeviceResourceTier() {
  const memory = getDeviceMemory();
  const cores = getHardwareConcurrency();
  const isMobile = isMobileDevice();
  const hasWebGPU = await checkWebGPU();

  // Ultra-low: All mobile devices (iPhone, Android phones, tablets)
  // Mobile browsers have strict memory limits, use smallest models
  if (isMobile) {
    return 'ultra-low';
  }

  // Low-end devices: desktop with < 4GB RAM or < 4 cores
  if (memory < 4 || cores < 4) {
    return 'low';
  }

  // High-end devices: WebGPU support + 8GB+ RAM
  if (hasWebGPU && memory >= 8) {
    return 'high';
  }

  // Medium-tier: everything else (desktop 4-8GB)
  return 'medium';
}

/**
 * Gets optimal WASM thread count based on device
 * @returns {number} Recommended number of WASM threads
 */
export function getOptimalWasmThreads() {
  const cores = getHardwareConcurrency();
  const isMobile = isMobileDevice();

  if (isMobile) {
    // Mobile: Use 1 thread to avoid resource exhaustion
    return 1;
  }

  // Desktop: Use half the cores (up to 4)
  return Math.min(Math.floor(cores / 2), 4);
}
