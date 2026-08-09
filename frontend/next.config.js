/** @type {import('next').NextConfig} */
const isTauri = !!process.env.TAURI;
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  // 本地开发 / Tauri 构建时不用 basePath，只有生产环境部署才用
  ...(isTauri || isDev ? {} : { basePath: '/image' }),
  trailingSlash: true,
  // Tauri 构建时启用静态导出
  ...(isTauri ? { output: 'export', images: { unoptimized: true } } : {}),
};

module.exports = nextConfig;
