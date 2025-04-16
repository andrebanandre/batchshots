declare module 'react-canvas-draw' {
  import * as React from 'react';

  export interface CanvasDrawProps {
    onChange?: (canvas: CanvasDraw) => void;
    loadTimeOffset?: number;
    lazyRadius?: number;
    brushRadius?: number;
    brushColor?: string;
    catenaryColor?: string;
    gridColor?: string;
    backgroundColor?: string;
    hideGrid?: boolean;
    canvasWidth?: number;
    canvasHeight?: number;
    disabled?: boolean;
    imgSrc?: string;
    saveData?: string;
    immediateLoading?: boolean;
    hideInterface?: boolean;
    gridSizeX?: number;
    gridSizeY?: number;
    gridLineWidth?: number;
    hideGridX?: boolean;
    hideGridY?: boolean;
    enablePanAndZoom?: boolean;
    mouseZoomFactor?: number;
    zoomExtents?: {
      min: number;
      max: number;
    };
    clampLinesToDocument?: boolean;
  }

  export default class CanvasDraw extends React.Component<CanvasDrawProps> {
    canvas: {
      drawing: HTMLCanvasElement;
      temp: HTMLCanvasElement;
    };
    ctx: {
      drawing: CanvasRenderingContext2D;
      temp: CanvasRenderingContext2D;
    };
    
    getSaveData(): string;
    loadSaveData(saveData: string, immediate?: boolean): void;
    clear(): void;
    getDataURL(fileType?: string, useBgImage?: boolean, backgroundColour?: string): string;
    simulateDrawingLines(lines: { points: { x: number; y: number }[]; brushColor: string; brushRadius: number }[]): void;
    getCanvas(): HTMLCanvasElement;
  }
} 