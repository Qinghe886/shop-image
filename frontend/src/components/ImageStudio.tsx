'use client';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import ImageCropEditor from '@/components/ImageCropEditor';
import { convertImage, formatBytes, hexToRgb, processIdPhoto } from '@/lib/image';
import { platformPresets } from '@/lib/presets';
import { idPhotoSpecs, idPhotoPaperSizes, getBgColorHex, getSpecByAspect } from '@/lib/idphoto-specs';
import { renderPrintLayout } from '@/lib/print-layout';
import type { CropAspect, CropSettings, IdPhotoSettings, ImageItem, OutputSettings, PresetId, StudioMode } from '@/lib/types';

const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M3.75 7.75A2.75 2.75 0 0 1 6.5 5h3.1l2 2h5.9a2.75 2.75 0 0 1 2.75 2.75v6.5A2.75 2.75 0 0 1 17.5 19h-11a2.75 2.75 0 0 1-2.75-2.75v-8.5Z" />
      <path d="M4 9h16" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="3" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
      <path d="M12 14v2" />
    </svg>
  );
}

function ImagePlaceholderIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M8 14.5 10.4 12l2.2 2.1 1.6-1.7L18 16" />
      <circle cx="9" cy="9.5" r="1.2" />
    </svg>
  );
}

function ProcessIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 4v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function createItem(file: File): ImageItem {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
    name: file.name,
    size: file.size,
    type: file.type,
    previewUrl: URL.createObjectURL(file),
    status: 'queued',
  };
}

interface ImageStudioProps {
  selectedPresetId: PresetId;
  presetRequestVersion: number;
  onPresetChange: (id: PresetId) => void;
}

export default function ImageStudio({ selectedPresetId, presetRequestVersion, onPresetChange }: ImageStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const handledPresetRequestVersion = useRef(presetRequestVersion);
  const [items, setItems] = useState<ImageItem[]>([]);
  const [settings, setSettings] = useState<OutputSettings>({ format: 'original', quality: 0.82, maxDimension: 1600, fileNameMode: 'original' });
  const [mode, setMode] = useState<StudioMode>('general');
  const [professionalOperation, setProfessionalOperation] = useState<'compress' | 'convert'>('compress');
  const [idPhotoSettings, setIdPhotoSettings] = useState<IdPhotoSettings>({
    specId: '1inch',
    bgPreset: 'red',
    bgCustomColor: '#FF0000',
    tolerance: 45,
    feather: 3,
    paperSizeId: '5inch',
    generatePrintLayout: false,
  });
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const completed = useMemo(() => items.filter((item) => item.status === 'done' && item.outputBlob), [items]);
  const editingIndex = editingItemId ? items.findIndex((item) => item.id === editingItemId) : -1;
  const editingItem = editingIndex >= 0 ? items[editingIndex] : null;
  const compressionPercent = Math.round((1 - settings.quality) * 100);

  useEffect(() => {
    if (handledPresetRequestVersion.current === presetRequestVersion) return;
    handledPresetRequestVersion.current = presetRequestVersion;
    const preset = platformPresets.find((item) => item.id === selectedPresetId);
    if (preset) {
      setSettings(preset.settings);
      setMode('ecommerce');
      setEditingItemId(null);
    }
  }, [selectedPresetId, presetRequestVersion]);

  function switchMode(newMode: StudioMode) {
    if (mode === newMode) return;
    setMode(newMode);
    setEditingItemId(null);
    if (newMode === 'general') {
      setProfessionalOperation('compress');
      setSettings((current) => ({ ...current, format: 'original', quality: 0.82 }));
    } else if (newMode === 'idphoto') {
      setSettings((current) => ({ ...current, format: 'png', quality: 1 }));
    }
  }

  function selectPreset(id: PresetId) {
    const preset = platformPresets.find((item) => item.id === id);
    if (!preset) return;
    setMode('ecommerce');
    setEditingItemId(null);
    onPresetChange(id);
    setSettings(preset.settings);
  }

  function selectProfessionalOperation(operation: 'compress' | 'convert') {
    setProfessionalOperation(operation);
    setSettings((current) => ({
      ...current,
      format: operation === 'compress' ? 'original' : 'webp',
    }));
  }

  function resetAdvancedSettings() {
    if (mode === 'general') {
      setSettings({
        format: professionalOperation === 'compress' ? 'original' : 'webp',
        quality: 0.82,
        maxDimension: 1600,
      });
      return;
    }
    if (mode === 'idphoto') {
      setIdPhotoSettings({
        specId: '1inch',
        bgPreset: 'red',
        bgCustomColor: '#FF0000',
        tolerance: 45,
        feather: 3,
        paperSizeId: '5inch',
        generatePrintLayout: false,
      });
      return;
    }
    const preset = platformPresets.find((item) => item.id === selectedPresetId);
    if (preset) setSettings({ ...preset.settings });
  }

  function addFiles(files: FileList | File[]) {
    const accepted = Array.from(files).filter((file) => acceptedTypes.includes(file.type));
    if (!accepted.length) return;

    setItems((current) => {
      const availableSlots = Math.max(0, 100 - current.length);
      return [...current, ...accepted.slice(0, availableSlots).map(createItem)];
    });
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) addFiles(event.target.files);
    event.target.value = '';
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function resetProcessedItem(item: ImageItem, crop: CropSettings): ImageItem {
    return { ...item, crop, status: 'queued', outputBlob: undefined, outputName: undefined, outputSize: undefined, error: undefined };
  }

  function saveCrop(crop: CropSettings) {
    if (!editingItemId) return;
    setItems((current) => current.map((item) => item.id === editingItemId ? resetProcessedItem(item, crop) : item));
    setEditingItemId(null);
  }

  function applyCropToAll(crop: CropSettings) {
    setItems((current) => current.map((item) => resetProcessedItem(item, crop)));
    setEditingItemId(null);
  }

  function navigateCrop(direction: -1 | 1) {
    const next = items[editingIndex + direction];
    if (next) setEditingItemId(next.id);
  }

  async function processImages() {
    if (!items.length || processing) return;
    setProcessing(true);

    if (mode === 'idphoto') {
      const spec = getSpecByAspect(idPhotoSettings.specId);
      if (!spec) { setProcessing(false); return; }
      const bgColor = getBgColorHex(idPhotoSettings.bgPreset, idPhotoSettings.bgCustomColor);
      const targetRgb = hexToRgb('#FFFFFF'); // 默认去除白色背景

      for (const item of items) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'processing' } : entry));
        try {
          const canvas = await processIdPhoto(item.file, item.crop, spec.widthPx, spec.heightPx, {
            targetColor: targetRgb,
            tolerance: idPhotoSettings.tolerance,
            feather: idPhotoSettings.feather,
            bgColor,
          });
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((b) => b ? resolve(b) : reject(new Error('PNG 导出失败')), 'image/png');
          });
          const outName = item.name.replace(/\.[^/.]+$/, '') + '_证件照.png';
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'done', outputBlob: blob, outputName: outName, outputSize: blob.size } : entry));
        } catch (error) {
          setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'error', error: error instanceof Error ? error.message : '处理失败' } : entry));
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      setProcessing(false);
      return;
    }

    for (const item of items) {
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'processing' } : entry));
      try {
        const output = await convertImage(item.file, settings, item.crop);
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'done', outputBlob: output.blob, outputName: output.name, outputSize: output.blob.size } : entry));
      } catch (error) {
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: 'error', error: error instanceof Error ? error.message : '转换失败' } : entry));
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    setProcessing(false);
  }

  async function download() {
    if (!completed.length) return;
    // 证件照模式：生成排版后打包
    if (mode === 'idphoto' && idPhotoSettings.generatePrintLayout && completed.length > 0) {
      const zip = new JSZip();
      completed.forEach((item) => zip.file(item.outputName || item.name, item.outputBlob!));
      // 生成排版图（使用第一张已完成的照片）
      try {
        const spec = getSpecByAspect(idPhotoSettings.specId);
        const paper = idPhotoPaperSizes.find((p) => p.id === idPhotoSettings.paperSizeId);
        if (spec && paper && completed[0].outputBlob) {
          const img = await createImageBitmap(completed[0].outputBlob);
          const srcCanvas = document.createElement('canvas');
          srcCanvas.width = img.width;
          srcCanvas.height = img.height;
          srcCanvas.getContext('2d')!.drawImage(img, 0, 0);
          img.close();
          const layoutCanvas = renderPrintLayout(srcCanvas, paper.widthPx, paper.heightPx, 12);
          const layoutBlob = await new Promise<Blob>((resolve, reject) => {
            layoutCanvas.toBlob((b) => b ? resolve(b) : reject(new Error('排版导出失败')), 'image/png');
          });
          zip.file(`排版_${spec.name}_${paper.name}.png`, layoutBlob);
        }
      } catch (e) { /* 排版失败不影响下载 */ }
      saveAs(await zip.generateAsync({ type: 'blob' }), '证件照.zip');
      return;
    }
    if (completed.length === 1) {
      saveAs(completed[0].outputBlob!, completed[0].outputName || completed[0].name);
      return;
    }
    const zip = new JSZip();
    completed.forEach((item) => zip.file(item.outputName || item.name, item.outputBlob!));
    saveAs(await zip.generateAsync({ type: 'blob' }), 'storepic-works.zip');
  }

  return (
    <section id="tool" className="tool-shell">
      <div className="tool-main">
        <div
          role="button"
          tabIndex={0}
          aria-label={mode === 'ecommerce' ? '添加商品图片' : '添加图片'}
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="drop-plus">＋</span>
          <h2>{mode === 'ecommerce' ? '添加商品图片' : '添加图片'}</h2>
          <p>拖入 JPG、PNG、WebP，或点击选择</p>
          <div className="file-tags"><span>JPG</span><span>PNG</span><span>WEBP</span><em>最多 100 张</em></div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} hidden />
        </div>

        <div className="folder-row">
          <div className="folder-copy"><span className="folder-icon"><FolderIcon /></span><div><strong>{mode === 'ecommerce' ? '添加图片文件夹' : '添加文件夹'}</strong><p>批量导入图片</p></div></div>
          <button type="button" onClick={() => folderRef.current?.click()}>选择文件夹 ↗</button>
          <input ref={folderRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} webkitdirectory="" directory="" hidden />
        </div>

        <div className="queue-head"><div><h3>图片队列</h3><p>{items.length ? `${items.length} 张图片` : '等待导入'}</p></div>{items.length > 0 && <button type="button" onClick={() => { items.forEach((item) => URL.revokeObjectURL(item.previewUrl)); setItems([]); }}>清空</button>}</div>
        <div className="queue-box">
          {items.length === 0 ? <div className="queue-empty"><span aria-hidden="true"><ImagePlaceholderIcon /></span><p>队列中还没有图片。</p></div> : items.map((item) => (
            <div className={`queue-item ${mode !== 'ecommerce' ? 'is-editable' : ''}`} key={item.id}>
              <button type="button" className="queue-thumb" aria-label={`裁切 ${item.name}`} disabled={mode === 'ecommerce'} onClick={() => setEditingItemId(item.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={item.name} loading="lazy" decoding="async" />
                {item.crop && <i>已裁切</i>}
              </button>
              <div><strong>{item.name}</strong><p>{formatBytes(item.size)}{item.outputSize ? ` → ${formatBytes(item.outputSize)}` : ''}</p>{item.error && <small>{item.error}</small>}</div>
              {mode !== 'ecommerce' && <button type="button" className="crop-item-button" onClick={() => setEditingItemId(item.id)}>{item.crop ? item.crop.aspect === 'free' ? '编辑裁切' : `${item.crop.aspect} · 编辑` : '裁切'}</button>}
              <span>{{ queued: '待处理', processing: '处理中', done: '已完成', error: '失败' }[item.status]}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="settings-panel">
        <div className="setting-title compact"><div><small>输出设置</small><h2>处理方式</h2></div><span><i /> 本地</span></div>
        <div className="mode-switch" role="group" aria-label="处理模式">
          <button type="button" className={mode === 'ecommerce' ? 'active' : ''} aria-pressed={mode === 'ecommerce'} onClick={() => selectPreset(selectedPresetId)}><span>电商预设</span><small>平台快速设置</small></button>
          <button type="button" className={mode === 'general' ? 'active' : ''} aria-pressed={mode === 'general'} onClick={() => switchMode('general')}><span>通用模式</span><small>压缩与转换</small></button>
          <button type="button" className={mode === 'idphoto' ? 'active' : ''} aria-pressed={mode === 'idphoto'} onClick={() => switchMode('idphoto')}><span>证件照</span><small>换底排版</small></button>
        </div>
        {mode === 'ecommerce' ? (
          <>
            <div className="setting-block">
              <label>电商预设</label>
              <select value={selectedPresetId} onChange={(event) => selectPreset(event.target.value as PresetId)}>
                {platformPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} — {preset.description}</option>)}
              </select>
              <p>仅作为通用参考；发布前请核对平台最新要求。</p>
            </div>
            <div className="setting-block">
              <label>输出格式</label>
              <div className="format-tabs">{(['webp', 'avif', 'jpeg'] as const).map((format) => <button type="button" key={format} className={settings.format === format ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, format }))}>{format}</button>)}</div>
              <p>{settings.format === 'avif' ? '文件通常更小，但编码时间更长。' : settings.format === 'webp' ? '适合大多数网店和商品页面。' : '兼容性更好，适合平台上传。'}</p>
            </div>
          </>
        ) : (
          <div className="professional-panel compact">
            <div className="professional-context"><small>GENERAL TOOLS</small><strong>通用处理</strong></div>
            <div className="operation-tabs compact">
              <button type="button" className={professionalOperation === 'compress' ? 'active' : ''} onClick={() => selectProfessionalOperation('compress')}><strong>压缩</strong><small>保持格式</small></button>
              <button type="button" className={professionalOperation === 'convert' ? 'active' : ''} onClick={() => selectProfessionalOperation('convert')}><strong>转换</strong><small>指定格式</small></button>
            </div>
            <div className="professional-format compact">
              <label>输出格式</label>
              {professionalOperation === 'compress' ? (
                <button type="button" className="original-format active">保持原格式</button>
              ) : (
                <div className="professional-format-grid">{(['webp', 'avif', 'jpeg', 'png'] as const).map((format) => <button type="button" key={format} className={settings.format === format ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, format }))}>{format}</button>)}</div>
              )}
            </div>
            <button type="button" className="crop-entry" disabled={!items.length} onClick={() => setEditingItemId(items.find((item) => item.crop)?.id ?? items[0]?.id)}>
              <span className="crop-entry-mark"><i /></span>
              <span className="crop-entry-copy"><strong>批量裁切</strong><small>{items.length ? `已设置 ${items.filter((item) => item.crop).length} / ${items.length}` : '添加图片后可裁切'}</small></span>
              <span className="crop-entry-action">编辑</span>
            </button>
          </div>
        )}
        {mode === 'idphoto' && (
          <div className="idphoto-panel compact">
            <div className="idphoto-context"><small>ID PHOTO</small><strong>证件照处理</strong></div>
            <div className="setting-block">
              <label>证件照尺寸</label>
              <select value={idPhotoSettings.specId} onChange={(e) => setIdPhotoSettings((s) => ({ ...s, specId: e.target.value as CropAspect }))}>
                {idPhotoSpecs.map((spec) => (
                  <option key={spec.id} value={spec.id}>{spec.name} — {spec.widthMm}×{spec.heightMm} mm（{spec.description}）</option>
                ))}
              </select>
            </div>
            <div className="setting-block">
              <label>替换背景色</label>
              <div className="bg-color-grid">
                {(['white', 'red', 'blue'] as const).map((key) => (
                  <button type="button" key={key} className={`bg-color-swatch ${idPhotoSettings.bgPreset === key ? 'active' : ''}`} style={{ background: getBgColorHex(key, '') }} title={getBgColorHex(key, '')} onClick={() => setIdPhotoSettings((s) => ({ ...s, bgPreset: key }))} />
                ))}
                <label className="bg-color-swatch" style={{ background: idPhotoSettings.bgCustomColor, cursor: 'pointer' }}>
                  <input type="color" value={idPhotoSettings.bgCustomColor} onChange={(e) => setIdPhotoSettings((s) => ({ ...s, bgPreset: 'custom', bgCustomColor: e.target.value }))} />
                </label>
              </div>
              <div className="bg-label-row">{(['white', 'red', 'blue'] as const).map((key) => <span key={key}>{getBgColorHex(key, '') === '#FFFFFF' ? '白色' : getBgColorHex(key, '') === '#FF0000' ? '红色' : '蓝色'}</span>)}<span>自定义</span></div>
            </div>
            <div className="setting-block">
              <label>容差 <output>{idPhotoSettings.tolerance}</output></label>
              <input type="range" min="10" max="120" value={idPhotoSettings.tolerance} onChange={(e) => setIdPhotoSettings((s) => ({ ...s, tolerance: Number(e.target.value) }))} />
              <label style={{ marginTop: 10 }}>边缘羽化 <output>{idPhotoSettings.feather}px</output></label>
              <input type="range" min="0" max="10" value={idPhotoSettings.feather} onChange={(e) => setIdPhotoSettings((s) => ({ ...s, feather: Number(e.target.value) }))} />
            </div>
            <div className="setting-block">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={idPhotoSettings.generatePrintLayout} onChange={(e) => setIdPhotoSettings((s) => ({ ...s, generatePrintLayout: e.target.checked }))} style={{ width: 18, height: 18 }} />
                生成冲印排版
              </label>
              {idPhotoSettings.generatePrintLayout && (
                <>
                  <div className="format-tabs" style={{ marginTop: 8 }}>
                    {idPhotoPaperSizes.map((p) => (
                      <button type="button" key={p.id} className={idPhotoSettings.paperSizeId === p.id ? 'active' : ''} onClick={() => setIdPhotoSettings((s) => ({ ...s, paperSizeId: p.id }))}>{p.name}（{p.widthMm}×{p.heightMm}mm）</button>
                    ))}
                  </div>
                  {(() => {
                    const spec = getSpecByAspect(idPhotoSettings.specId);
                    const paper = idPhotoPaperSizes.find((p) => p.id === idPhotoSettings.paperSizeId);
                    if (spec && paper) {
                      const cols = Math.floor((paper.widthPx - 12) / (spec.widthPx + 12));
                      const rows = Math.floor((paper.heightPx - 12) / (spec.heightPx + 12));
                      return <p className="layout-info">预计排版 {cols}×{rows} = {cols * rows} 张</p>;
                    }
                    return null;
                  })()}
                </>
              )}
            </div>
            <button type="button" className="crop-entry" disabled={!items.length} onClick={() => setEditingItemId(items.find((item) => item.crop)?.id ?? items[0]?.id)}>
              <span className="crop-entry-mark"><i /></span>
              <span className="crop-entry-copy"><strong>裁切人像</strong><small>{items.length ? `已设置 ${items.filter((item) => item.crop).length} / ${items.length}` : '添加图片后可裁切'}</small></span>
              <span className="crop-entry-action">编辑</span>
            </button>
          </div>
        )}
        <div className="advanced-wrap compact">
          <details className="advanced">
            <summary><span><strong>高级选项</strong><small>压缩 {compressionPercent}% · 长边 {settings.maxDimension}px</small></span><b aria-hidden="true">＋</b></summary>
            <div className="advanced-body compact">
              <div className="advanced-control-head"><label htmlFor="compression-range">压缩比例</label><output>{compressionPercent}%</output></div>
              <input id="compression-range" type="range" min="5" max="50" value={compressionPercent} onChange={(event) => setSettings((current) => ({ ...current, quality: 1 - Number(event.target.value) / 100 }))} />
              <div className="advanced-control-head"><label htmlFor="dimension-range">最长边</label><output>{settings.maxDimension}px</output></div>
              <input id="dimension-range" type="range" min="800" max="3000" step="100" value={settings.maxDimension} onChange={(event) => setSettings((current) => ({ ...current, maxDimension: Number(event.target.value) }))} />
            </div>
          </details>
        </div>
        <div className="privacy-note compact trust-strip"><span><LockIcon /></span><div><strong>本地安全处理</strong><p>浏览器内完成，图片不会上传服务器</p></div></div>
        <div className="action-buttons compact">
          <button type="button" className="process-button" onClick={processImages} disabled={!items.length || processing}>{processing ? '正在处理…' : completed.length ? '再次处理图片' : '处理图片'}<span className="button-icon"><ProcessIcon /></span></button>
          {completed.length > 0 && <button type="button" className="download-button" onClick={download} disabled={processing}>下载结果 ({completed.length})<span className="button-icon"><DownloadIcon /></span></button>}
        </div>
      </aside>
      {editingItem && mode !== 'ecommerce' && <ImageCropEditor item={editingItem} index={editingIndex} total={items.length} onClose={() => setEditingItemId(null)} onSave={saveCrop} onApplyAll={applyCropToAll} onNavigate={navigateCrop} />}
    </section>
  );
}
