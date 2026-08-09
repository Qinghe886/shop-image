/** 纯 Canvas 像素级背景去除（零依赖） */

/** 将十六进制颜色字符串转为 RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/** 对数组取中位数（各通道独立） */
function medianChannel(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * 从图片边缘采样检测背景色
 * 采样图片四边 5px 宽的条带，取各通道中位数
 */
export function detectBackgroundColor(
  imageData: ImageData,
  sampleWidth = 5,
): { r: number; g: number; b: number } {
  const { data, width, height } = imageData;
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];

  const sw = Math.min(sampleWidth, width);
  const sh = Math.min(sampleWidth, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // 仅采样边缘区域
      const isEdge =
        x < sw || x >= width - sw || y < sh || y >= height - sh;
      if (!isEdge) continue;

      const idx = (y * width + x) * 4;
      rs.push(data[idx]);
      gs.push(data[idx + 1]);
      bs.push(data[idx + 2]);
    }
  }

  if (rs.length === 0) return { r: 255, g: 255, b: 255 };

  return {
    r: medianChannel(rs),
    g: medianChannel(gs),
    b: medianChannel(bs),
  };
}

/**
 * 基于 RGB 欧氏距离去除背景
 * - tolerance（容差）：距离 ≤ 此值 → 完全透明
 * - feather（羽化）：容差到容差+羽化之间 → 线性过渡 alpha
 * 返回新的 ImageData（不修改原数据）
 */
export function removeBackground(
  imageData: ImageData,
  targetColor: { r: number; g: number; b: number },
  tolerance: number,
  feather: number,
): ImageData {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data.length);

  const maxDist = tolerance + feather;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // RGB 欧氏距离
    const dr = r - targetColor.r;
    const dg = g - targetColor.g;
    const db = b - targetColor.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    let alpha = 255;
    if (dist <= tolerance) {
      alpha = 0;
    } else if (dist <= maxDist && maxDist > tolerance) {
      // 在容差和最大距离之间线性插值
      alpha = Math.round(((dist - tolerance) / feather) * 255);
    }

    output[i] = r;
    output[i + 1] = g;
    output[i + 2] = b;
    output[i + 3] = Math.min(255, Math.max(0, alpha));
  }

  return new ImageData(output, width, height);
}

/**
 * 将去背景后的 ImageData 合成到指定背景色上
 * 返回合成后的 canvas
 */
export function compositeOverBackground(
  imageData: ImageData,
  bgColor: string,
): HTMLCanvasElement {
  const { width, height, data } = imageData;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 不可用');

  // 填充背景色
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 将去背景后的像素绘制到背景上
  const bgImageData = ctx.getImageData(0, 0, width, height);
  const bgData = bgImageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    // alpha 混合：前景 * alpha + 背景 * (1 - alpha)
    bgData[i] = Math.round(data[i] * alpha + bgData[i] * (1 - alpha));
    bgData[i + 1] = Math.round(data[i + 1] * alpha + bgData[i + 1] * (1 - alpha));
    bgData[i + 2] = Math.round(data[i + 2] * alpha + bgData[i + 2] * (1 - alpha));
    bgData[i + 3] = 255;
  }

  ctx.putImageData(bgImageData, 0, 0);
  return canvas;
}

/**
 * 一站式背景替换：检测 → 去除 → 合成
 */
export function replaceBackground(
  sourceCanvas: HTMLCanvasElement,
  targetColor: { r: number; g: number; b: number } | null,
  tolerance: number,
  feather: number,
  bgColor: string,
): HTMLCanvasElement {
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 不可用');

  const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);

  // 如果未指定目标色，自动检测
  const effectiveColor = targetColor || detectBackgroundColor(imageData);

  // 去除背景
  const processed = removeBackground(imageData, effectiveColor, tolerance, feather);

  // 合成到新背景
  return compositeOverBackground(processed, bgColor);
}
