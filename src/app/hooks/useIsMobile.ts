import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  memory?: number; // Memory in GB if available
  isLowPerformanceDevice: boolean; // Combined check for memory, CPU, and device capabilities
}

/**
 * Hook to detect device capabilities and optimize performance accordingly
 * @param memoryThreshold Memory threshold in GB to consider a device low-memory (default: 4)
 * @returns Device information including mobile status and performance details
 */
export const useIsMobile = (memoryThreshold = 4): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isLowPerformanceDevice: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect mobile device
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    // Get device memory if available
    let memory: number | undefined = undefined;
    let hasLowMemory = false;

    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      memory = (navigator as unknown as { deviceMemory: number }).deviceMemory;
      hasLowMemory = memory !== undefined && memory < memoryThreshold;
    }

    // Check for CPU constraints (hardware concurrency)
    let hasLowCPU = false;
    if (typeof navigator !== 'undefined' && 'hardwareConcurrency' in navigator) {
      const cpuCores = navigator.hardwareConcurrency;
      // Consider devices with 4 or fewer cores as potentially lower performance
      hasLowCPU = cpuCores <= 4;
    }

    // Check for older devices by looking at common patterns in user agent
    const isOlderDevice = 
      // Older iPhones (pre-iPhone X)
      /iPhone\s(([5-8],?)+|SE)/i.test(userAgent) ||
      // Older Android versions
      /Android\s[2-7]\./i.test(userAgent) ||
      // Older iPad models
      /iPad;\sCPU\sOS\s([5-9]|10|11)_/i.test(userAgent);

    // Device is considered low performance if any of these are true
    const isLowPerformanceDevice = 
      hasLowMemory || 
      hasLowCPU || 
      isOlderDevice || 
      // For mobile devices with unknown specifications, err on the side of caution
      (isMobile && memory === undefined);

    setDeviceInfo({
      isMobile,
      memory,
      isLowPerformanceDevice
    });
  }, [memoryThreshold]);

  return deviceInfo;
}; 