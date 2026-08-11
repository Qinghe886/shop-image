'use client';

import { useState } from 'react';
import ImageStudio from '@/components/ImageStudio';
import { platformPresets } from '@/lib/presets';
import type { PresetId } from '@/lib/types';

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2" />
    </svg>
  );
}

const benefits = [
  ['01', '图片留在本地', '所有处理都在你的设备上完成，图片不会发送到服务器。'],
  ['02', '真正支持批量', '导入单张图片或整个文件夹，再一次性下载全部结果。'],
  ['03', '原图始终不变', '只创建新的转换文件，不覆盖或修改你的源图片。'],
  ['04', '实用电商预设', '提供格式、质量与尺寸起点，并允许继续自由调整。'],
];

const faqs = [
  ['可以导入哪些图片格式？', '支持 JPG、JPEG、PNG 和 WebP。SVG 需要不同的安全处理流程，目前暂不支持。'],
  ['图铺工坊真的免费吗？', '是的。当前功能无需账户、银行卡、订阅或转换额度。'],
  ['压缩会降低图片质量吗？', '部分格式使用有损压缩。均衡模式会在减小体积的同时尽量保留商品细节。'],
  ['为什么 AVIF 转换更慢？', 'AVIF 编码计算量更大，通常能生成更小文件，但所需时间也更长。'],
  ['电商预设能保证通过审核吗？', '不能。平台规则可能因国家、类目和图片类型变化，请在发布前核对最新要求。'],
];

export default function Home() {
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>('woocommerce');
  const [presetRequestVersion, setPresetRequestVersion] = useState(0);

  function choosePreset(id: PresetId) {
    setSelectedPresetId(id);
    setPresetRequestVersion((version) => version + 1);
    document.getElementById('tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <main>
      <header className="site-header">
        <a href="#" className="wordmark"><span>图铺工坊</span><i>StorePic Works</i></a>
        <span aria-hidden="true" />
        <nav><a href="#tool">图片转换</a><a href="#presets">电商预设</a><a href="/image/metadata">清除照片信息</a><a href="#privacy">隐私</a></nav>
      </header>

      <div className="studio-section"><ImageStudio selectedPresetId={selectedPresetId} presetRequestVersion={presetRequestVersion} onPresetChange={setSelectedPresetId} /></div>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">● 专为商品图片打造</p>
          <h1>更小的文件。<br /><em>清晰的商品图片。</em></h1>
          <p className="hero-description">无需上传原图，即可批量调整尺寸并转换商品图片。所有处理都在你的浏览器中完成。</p>
          <div className="hero-actions"><a href="#tool">添加图片 <span>↗</span></a><span className="device-note"><LockIcon /> 在此设备上处理</span></div>
        </div>
        <div className="hero-visual">
          <div className="visual-grid" />
          <div className="visual-orbit" />
          <div className="mock-window">
            <div className="mock-bar"><span>•••</span><small>本地处理</small></div>
            <div className="mock-canvas">
              <span className="jpg-badge">JPG</span>
              <div className="product-card"><small>原图</small><i /><strong>01</strong></div>
              <span className="webp-badge">WEBP</span>
            </div>
            <div className="mock-stats"><span>4.8 MB</span><i /><strong>286 KB</strong><b>94%<small>更轻</small></b></div>
          </div>
        </div>
      </section>

      <section id="presets" className="preset-section">
        <div className="preset-intro"><div><p>电商预设</p><h2>常见电商平台的实用起始设置。</h2></div><span>选择适合目标平台的起始设置。处理前仍可自由调整格式、质量和尺寸。</span></div>
        <div className="preset-grid">{platformPresets.map((preset, index) => <button type="button" key={preset.id} className={selectedPresetId === preset.id ? 'selected' : ''} aria-pressed={selectedPresetId === preset.id} onClick={() => choosePreset(preset.id)}><b>↗</b><small>{String(index + 1).padStart(2, '0')}</small><h3>{preset.name}</h3><p>{preset.description}</p></button>)}</div>
      </section>

      <section id="privacy" className="trust-section">
        <article className="privacy-card">
          <div className="privacy-card-glow" aria-hidden="true" />
          <div className="privacy-card-head"><div className="privacy-lock"><LockIcon /></div><span>LOCAL PROCESSING</span></div>
          <div className="privacy-card-copy">
            <p>隐私优先</p>
            <h2>你的图片，<br />只在你的设备上。</h2>
            <span>压缩、转换和打包全部在浏览器内完成。没有上传，也没有云端副本。</span>
          </div>
          <div className="privacy-tags"><b><i />不上传</b><b><i />不追踪</b><b><i />不改原图</b></div>
        </article>

        <div className="value-panel">
          <div className="value-intro">
            <div><p>图铺工坊 · StorePic Works</p><h2>少一点步骤，<br />快一点上架。</h2></div>
            <span>为电商图片准备的本地批处理工具。无需账户或额度，添加图片、选择结果、直接下载。</span>
          </div>
          <div className="value-grid">{benefits.map(([number, title, description]) => <article key={number}><small>{number}</small><div><h3>{title}</h3><p>{description}</p></div><b aria-hidden="true">↗</b></article>)}</div>
          <div className="value-footer"><strong>免费使用</strong><span>WebP · AVIF · JPEG · PNG</span><em>最多 100 张 / 批次</em></div>
        </div>
      </section>

      <section className="faq-section"><p>FAQ</p><h2>常见问题。</h2><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span>＋</span></summary><p>{answer}</p></details>)}</div></section>
      <footer><strong>图铺工坊｜StorePic Works</strong><span>在浏览器中完成批量图片转换。© 2026 StorePic Works</span></footer>
    </main>
  );
}
