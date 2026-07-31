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
