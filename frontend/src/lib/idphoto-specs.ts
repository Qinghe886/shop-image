import type { IdPhotoSpec, IdPhotoPaperSize } from './types';

/** 标准证件照尺寸（300 DPI） */
export const idPhotoSpecs: IdPhotoSpec[] = [
  { id: '1inch', name: '1寸', widthMm: 25, heightMm: 35, widthPx: 295, heightPx: 413, description: '常用证件照、简历' },
  { id: 'small1inch', name: '小1寸', widthMm: 22, heightMm: 32, widthPx: 260, heightPx: 378, description: '驾驶证等' },
  { id: 'large1inch', name: '大1寸', widthMm: 33, heightMm: 48, widthPx: 390, heightPx: 567, description: '护照、通行证' },
  { id: 'small2inch', name: '小2寸', widthMm: 35, heightMm: 45, widthPx: 413, heightPx: 531, description: '简历、毕业证' },
  { id: '2inch', name: '2寸', widthMm: 35, heightMm: 49, widthPx: 413, heightPx: 579, description: '各类证件' },
];

/** 标准相纸尺寸（300 DPI） */
export const idPhotoPaperSizes: IdPhotoPaperSize[] = [
  { id: '5inch', name: '5寸', widthMm: 89, heightMm: 127, widthPx: 1051, heightPx: 1500 },
  { id: '6inch', name: '6寸', widthMm: 102, heightMm: 152, widthPx: 1205, heightPx: 1795 },
];

/** 预设背景色 */
export const bgColorPresets = {
  white: { label: '白色', hex: '#FFFFFF' },
  red: { label: '红色', hex: '#FF0000' },
  blue: { label: '蓝色', hex: '#438EDB' },
} as const;

/** 常见要去除的背景色 */
export const bgColorsToRemove = [
  { label: '白色', hex: '#FFFFFF' },
  { label: '浅蓝', hex: '#B0D5F0' },
  { label: '浅灰', hex: '#D0D0D0' },
  { label: '绿色', hex: '#5CB85C' },
] as const;

/** 根据 CropAspect 获取证件照规格 */
export function getSpecByAspect(aspect: string): IdPhotoSpec | undefined {
  return idPhotoSpecs.find((s) => s.id === aspect);
}

/** 获取纸张规格 */
export function getPaperSize(id: string): IdPhotoPaperSize | undefined {
  return idPhotoPaperSizes.find((p) => p.id === id);
}

/** 获取替换背景色的 hex 值 */
export function getBgColorHex(bgPreset: string, customColor: string): string {
  if (bgPreset === 'custom') return customColor;
  const preset = bgColorPresets[bgPreset as keyof typeof bgColorPresets];
  return preset ? preset.hex : '#FFFFFF';
}
