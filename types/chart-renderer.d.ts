export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartOptions {
  width: number;
  height: number;
  animation?: boolean;
  duration?: number;
}

export declare class ChartRenderer {
  constructor(canvas: HTMLCanvasElement, options?: ChartOptions);
  drawLine(datasets: ChartDataset[]): void;
  drawBar(datasets: ChartDataset[]): void;
  drawPie(data: ChartDataset[], options?: { donut?: boolean }): void;
  drawRadar(datasets: ChartDataset[]): void;
  destroy(): void;
}
