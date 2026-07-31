import type { Metadata } from 'next';
import 'react-easy-crop/react-easy-crop.css';
import './globals.css';

export const metadata: Metadata = {
  title: '图铺工坊｜StorePic Works — 免费电商图片压缩与转换',
  description: '图铺工坊在浏览器中批量压缩、调整尺寸并转换商品图片，支持 WebP、AVIF、JPEG 和 PNG。',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
