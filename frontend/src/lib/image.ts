import type { CropSettings, OutputFormat, OutputSettings, OutputTarget } from './types';

const mimeMap: Record<OutputFormat, string> = {
  webp: 'image/webp',
  avif: 'image/avif',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const inputFormatMap: Record<string, OutputFormat> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function resolveFormat(file: File, target: OutputTarget): OutputFormat {
  if (target !== 'original') return target;
  return inputFormatMap[file.type] ?? 'jpeg';
}

export function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function outputFileName(fileName: string, format: OutputFormat, settings: OutputSettings) {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const extension = format === 'jpeg' ? 'jpg' : format;
  if (settings.fileNameMode === 'detailed') {
    const compressionPercent = Math.round((1 - settings.quality) * 100);
    return `${baseName}_${format}_${compressionPercent}pct.${extension}`;
  }
  return `${baseName}.${extension}`;
}

function transformedSize(width: number, height: number, rotation: CropSettings['rotation']) {
  return rotation === 90 || rotation === 270 ? { width: height, height: width } : { width, height };
}

function normalizeCrop(crop?: CropSettings) {
  if (!crop) return { x: 0, y: 0, width: 1, height: 1 };
  const width = Math.min(1, Math.max(0.0001, crop.width));
  const height = Math.min(1, Math.max(0.0001, crop.height));
  return {
    x: Math.min(1 - width, Math.max(0, crop.x)),
    y: Math.min(1 - height, Math.max(0, crop.y)),
    width,
    height,
  };
}

export async function renderCroppedCanvas(file: File, crop?: CropSettings, maxDimension?: number, background?: string) {
  const bitmap = await createImageBitmap(file);
  try {
    const rotation = crop?.rotation ?? 0;
    const size = transformedSize(bitmap.width, bitmap.height, rotation);
    const transformed = document.createElement('canvas');
    transformed.width = size.width;
    transformed.height = size.height;
    const transformedContext = transformed.getContext('2d');
    if (!transformedContext) throw new Error('当前浏览器不支持 Canvas 图片处理');

    transformedContext.translate(size.width / 2, size.height / 2);
    transformedContext.rotate((rotation * Math.PI) / 180);
    transformedContext.scale(crop?.flipHorizontal ? -1 : 1, crop?.flipVertical ? -1 : 1);
    transformedContext.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const normalized = normalizeCrop(crop);
    const sourceX = Math.floor(normalized.x * size.width);
    const sourceY = Math.floor(normalized.y * size.height);
    const sourceWidth = Math.max(1, Math.min(size.width - sourceX, Math.round(normalized.width * size.width)));
    const sourceHeight = Math.max(1, Math.min(size.height - sourceY, Math.round(normalized.height * size.height)));
    const scale = maxDimension ? Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight)) : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('当前浏览器不支持 Canvas 图片处理');
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(transformed, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

export async function convertImage(file: File, settings: OutputSettings, crop?: CropSettings): Promise<{ blob: Blob; name: string }> {
  const format = resolveFormat(file, settings.format);
  const canvas = await renderCroppedCanvas(file, crop, settings.maxDimension, format === 'jpeg' ? '#ffffff' : undefined);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error(`${format.toUpperCase()} 转换失败，浏览器可能不支持该格式`));
        else resolve(result);
      },
      mimeMap[format],
      settings.quality,
    );
  });

  return {
    blob,
    name: outputFileName(file.name, format, settings),
  };
}

/**
 * 十六进制颜色转 RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * 证件照专用处理：裁切 + 缩放到精确尺寸 + 背景替换
 */
export async function processIdPhoto(
  file: File,
  crop: CropSettings | undefined,
  specWidth: number,
  specHeight: number,
  bgSettings: {
    tolerance: number;
    feather: number;
    bgColor: string;
  },
): Promise<HTMLCanvasElement> {
  // 1. 裁切
  const cropped = await renderCroppedCanvas(file, crop);
  const { width: srcW, height: srcH } = cropped;

  // 2. 等比缩放到目标尺寸，居中放置
  const canvas = document.createElement('canvas');
  canvas.width = specWidth;
  canvas.height = specHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 不可用');

  const scale = Math.min(specWidth / srcW, specHeight / srcH);
  const drawW = Math.round(srcW * scale);
  const drawH = Math.round(srcH * scale);
  const dx = Math.floor((specWidth - drawW) / 2);
  const dy = Math.floor((specHeight - drawH) / 2);
  ctx.drawImage(cropped, dx, dy, drawW, drawH);

  // 3. 自动检测背景色（从图像边缘采样，取各通道中位数）
  const imageData = ctx.getImageData(0, 0, specWidth, specHeight);
  const { detectBackgroundColor } = await import('./background-removal');
  const targetColor = detectBackgroundColor(imageData, 5);

  // 4. 背景去除
  const { data } = imageData;
  const { tolerance, feather } = bgSettings;
  const maxDist = tolerance + feather;
  const outputData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - targetColor.r;
    const dg = data[i + 1] - targetColor.g;
    const db = data[i + 2] - targetColor.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    let alpha = 255;
    if (dist <= tolerance) {
      alpha = 0;
    } else if (dist <= maxDist && maxDist > tolerance) {
      alpha = Math.round(((dist - tolerance) / feather) * 255);
    }
    outputData[i] = data[i];
    outputData[i + 1] = data[i + 1];
    outputData[i + 2] = data[i + 2];
    outputData[i + 3] = Math.min(255, Math.max(0, alpha));
  }

  // 5. 合成到新背景
  const result = document.createElement('canvas');
  result.width = specWidth;
  result.height = specHeight;
  const rCtx = result.getContext('2d');
  if (!rCtx) throw new Error('Canvas 不可用');

  rCtx.fillStyle = bgSettings.bgColor;
  rCtx.fillRect(0, 0, specWidth, specHeight);

  const bgImageData = rCtx.getImageData(0, 0, specWidth, specHeight);
  const bgData = bgImageData.data;
  for (let i = 0; i < outputData.length; i += 4) {
    const a = outputData[i + 3] / 255;
    bgData[i] = Math.round(outputData[i] * a + bgData[i] * (1 - a));
    bgData[i + 1] = Math.round(outputData[i + 1] * a + bgData[i + 1] * (1 - a));
    bgData[i + 2] = Math.round(outputData[i + 2] * a + bgData[i + 2] * (1 - a));
  }
  rCtx.putImageData(bgImageData, 0, 0);

  return result;
}
