/**
 * @jest-environment jsdom
 */
const { ChartRenderer } = require('../lib/chart-renderer');

describe('ChartRenderer', () => {
  let canvas;
  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
  });

  test('should create instance with canvas', () => {
    const renderer = new ChartRenderer(canvas);
    expect(renderer).toBeDefined();
    expect(renderer.canvas).toBe(canvas);
  });

  test('should draw line chart', () => {
    const renderer = new ChartRenderer(canvas);
    const datasets = [{ label: 'A', data: [10, 20, 30] }];
    expect(() => renderer.drawLine(datasets)).not.toThrow();
  });

  test('should draw bar chart', () => {
    const renderer = new ChartRenderer(canvas);
    const datasets = [{ label: 'B', data: [5, 15, 25] }];
    expect(() => renderer.drawBar(datasets)).not.toThrow();
  });

  test('should draw radar chart', () => {
    const renderer = new ChartRenderer(canvas);
    const datasets = [{ label: 'C', data: [0.8, 0.9, 0.75] }];
    expect(() => renderer.drawRadar(datasets)).not.toThrow();
  });
});
