/** @type {import('next').NextConfig} */
const isTauri = !!process.env.TAURI;

const nextConfig = {
  // Tauri 构建时不需要 basePath（静态文件从根路径加载）
  ...(isTauri ? {} : { basePath: '/image' }),
  trailingSlash: true,
  // Tauri 构建时启用静态导出
  ...(isTauri ? { output: 'export', images: { unoptimized: true } } : {}),
};

module.exports = nextConfig;
