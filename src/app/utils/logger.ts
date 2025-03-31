/**
 * Simple logger utility for consistent logging
 * @param context The context name to include in log messages
 * @returns Logger object with methods for different log levels
 */
export function simpleLogger(context: string) {
  const prefix = `[${context}]`;
  
  return {
    log: (message: string, ...args: any[]) => {
      console.log(`${prefix} ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`${prefix} ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`${prefix} ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      console.info(`${prefix} ${message}`, ...args);
    }
  };
} 