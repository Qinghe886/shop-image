export type OutputFormat = 'webp' | 'avif' | 'jpeg' | 'png';
export type OutputTarget = OutputFormat | 'original';

export type PresetId = 'general' | 'woocommerce' | 'shopify' | 'amazon' | 'tiktok';
export type StudioMode = 'ecommerce' | 'general' | 'idphoto';

export type FileNameMode = 'original' | 'detailed';
export type CropAspect = 'free' | '1:1' | '4:5' | '3:4' | '16:9' | '1inch' | 'small1inch' | 'large1inch' | 'small2inch' | '2inch';
export type IdPhotoBgPreset = 'white' | 'red' | 'blue' | 'custom';

export interface CropSettings {
  aspect: CropAspect;
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface OutputSettings {
  format: OutputTarget;
  quality: number;
  maxDimension: number;
  fileNameMode?: FileNameMode;
}

export interface PlatformPreset {
  id: PresetId;
  name: string;
  description: string;
  settings: OutputSettings;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  outputBlob?: Blob;
  outputName?: string;
  outputSize?: number;
  error?: string;
  crop?: CropSettings;
}

export interface IdPhotoSpec {
  id: CropAspect;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
  description: string;
}

export interface IdPhotoPaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

export interface IdPhotoSettings {
  specId: CropAspect;
  bgPreset: IdPhotoBgPreset;
  bgCustomColor: string;
  tolerance: number;
  feather: number;
  paperSizeId: string;
  generatePrintLayout: boolean;
}
