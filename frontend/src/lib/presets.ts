import type { PlatformPreset } from './types';

export const platformPresets: PlatformPreset[] = [
  {
    id: 'general',
    name: '网站通用',
    description: '更快的店铺页面',
    settings: { format: 'webp', quality: 0.82, maxDimension: 1600 },
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: '商品图片库',
    settings: { format: 'webp', quality: 0.84, maxDimension: 1800 },
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: '适合店铺的 WebP',
    settings: { format: 'webp', quality: 0.8, maxDimension: 1600 },
  },
  {
    id: 'amazon',
    name: '亚马逊',
    description: '高质量 JPEG',
    settings: { format: 'jpeg', quality: 0.9, maxDimension: 2000 },
  },
  {
    id: 'tiktok',
    name: 'TikTok Shop',
    description: '兼容性更好的 JPEG',
    settings: { format: 'jpeg', quality: 0.86, maxDimension: 1600 },
  },
];
