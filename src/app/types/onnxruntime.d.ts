declare module 'onnxruntime-web' {
  export class Tensor {
    constructor(
      type: string,
      data: Float32Array | Int32Array | Uint8Array,
      dims: number[]
    );
    type: string;
    data: Float32Array | Int32Array | Uint8Array;
    dims: number[];
  }

  export interface SessionOptions {
    executionProviders?: string[];
    graphOptimizationLevel?: 'disabled' | 'basic' | 'extended' | 'all';
    enableCpuMemArena?: boolean;
    enableMemPattern?: boolean;
    executionMode?: 'sequential' | 'parallel';
    logId?: string;
    logSeverityLevel?: 0 | 1 | 2 | 3 | 4;
    logVerbosityLevel?: 0 | 1 | 2 | 3 | 4;
  }

  export interface InferenceSession {
    run(
      feeds: Record<string, Tensor>
    ): Promise<Record<string, Tensor>>;
    inputNames: string[];
    outputNames: string[];
  }

  export namespace InferenceSession {
    function create(
      modelPath: string,
      options?: SessionOptions
    ): Promise<InferenceSession>;
  }

  export const env: {
    wasm: {
      numThreads: number;
      simd: boolean;
      proxy: boolean;
    };
  };
} 