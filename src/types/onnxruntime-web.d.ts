declare module 'onnxruntime-web/all' {
  export interface Tensor {
    data: Float32Array | Uint8Array;
    dims: number[];
    type: string;
  }

  export interface TensorConstructor {
    new (type: string, data: Float32Array | Uint8Array, dims: number[]): Tensor;
  }

  export interface InferenceSession {
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
  }

  export interface InferenceSessionConstructor {
    create(modelPath: string, options?: Record<string, unknown>): Promise<InferenceSession>;
  }

  export interface OrtEnv {
    wasm: {
      wasmPaths: string;
    };
    logLevel: string;
  }

  export const env: OrtEnv;
  export const Tensor: TensorConstructor;
  export const InferenceSession: InferenceSessionConstructor;
} 