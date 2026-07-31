'use client';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import ImageCropEditor from '@/components/ImageCropEditor';
import { convertImage, formatBytes } from '@/lib/image';
import { platformPresets } from '@/lib/presets';
import type { CropSettings, ImageItem, OutputSettings, PresetId } from '@/lib/types';

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
  const [professionalMode, setProfessionalMode] = useState(true);
  const [professionalOperation, setProfessionalOperation] = useState<'compress' | 'convert'>('compress');
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
      setProfessionalMode(false);
      setEditingItemId(null);
    }
  }, [selectedPresetId, presetRequestVersion]);

  function enterProfessionalMode() {
    if (professionalMode) return;
    setProfessionalMode(true);
    setProfessionalOperation('compress');
    setSettings((current) => ({ ...current, format: 'original', quality: 0.82 }));
  }

  function selectProfessionalOperation(operation: 'compress' | 'convert') {
    setProfessionalOperation(operation);
    setSettings((current) => ({
      ...current,
      format: operation === 'compress' ? 'original' : 'webp',
    }));
  }

  function resetAdvancedSettings() {
    if (professionalMode) {
      setSettings({
        format: professionalOperation === 'compress' ? 'original' : 'webp',
        quality: 0.82,
        maxDimension: 1600,
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

  function selectPreset(id: PresetId) {
    const preset = platformPresets.find((item) => item.id === id);
    if (!preset) return;
    setProfessionalMode(false);
    setEditingItemId(null);
    onPresetChange(id);
    setSettings(preset.settings);
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
          aria-label={professionalMode ? '添加图片' : '添加商品图片'}
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
          <h2>{professionalMode ? '添加图片' : '添加商品图片'}</h2>
          <p>拖入 JPG、PNG、WebP，或点击选择</p>
          <div className="file-tags"><span>JPG</span><span>PNG</span><span>WEBP</span><em>最多 100 张</em></div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} hidden />
        </div>

        <div className="folder-row">
          <div className="folder-copy"><span className="folder-icon"><FolderIcon /></span><div><strong>{professionalMode ? '添加文件夹' : '添加图片文件夹'}</strong><p>批量导入图片</p></div></div>
          <button type="button" onClick={() => folderRef.current?.click()}>选择文件夹 ↗</button>
          <input ref={folderRef} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} webkitdirectory="" directory="" hidden />
        </div>

        <div className="queue-head"><div><h3>图片队列</h3><p>{items.length ? `${items.length} 张图片` : '等待导入'}</p></div>{items.length > 0 && <button type="button" onClick={() => { items.forEach((item) => URL.revokeObjectURL(item.previewUrl)); setItems([]); }}>清空</button>}</div>
        <div className="queue-box">
          {items.length === 0 ? <div className="queue-empty"><span aria-hidden="true"><ImagePlaceholderIcon /></span><p>队列中还没有图片。</p></div> : items.map((item) => (
            <div className={`queue-item ${professionalMode ? 'is-editable' : ''}`} key={item.id}>
              <button type="button" className="queue-thumb" aria-label={`裁切 ${item.name}`} disabled={!professionalMode} onClick={() => setEditingItemId(item.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.previewUrl} alt={item.name} loading="lazy" decoding="async" />
                {item.crop && <i>已裁切</i>}
              </button>
              <div><strong>{item.name}</strong><p>{formatBytes(item.size)}{item.outputSize ? ` → ${formatBytes(item.outputSize)}` : ''}</p>{item.error && <small>{item.error}</small>}</div>
              {professionalMode && <button type="button" className="crop-item-button" onClick={() => setEditingItemId(item.id)}>{item.crop ? item.crop.aspect === 'free' ? '编辑裁切' : `${item.crop.aspect} · 编辑` : '裁切'}</button>}
              <span>{{ queued: '待处理', processing: '处理中', done: '已完成', error: '失败' }[item.status]}</span>
            </div>
          ))}
        </div>
      </div>

      <aside className="settings-panel">
        <div className="setting-title compact"><div><small>输出设置</small><h2>处理方式</h2></div><span><i /> 本地</span></div>
        <div className="mode-switch" role="group" aria-label="处理模式">
          <button type="button" className={!professionalMode ? 'active' : ''} aria-pressed={!professionalMode} onClick={() => selectPreset(selectedPresetId)}><span>电商预设</span><small>平台快速设置</small></button>
          <button type="button" className={professionalMode ? 'active' : ''} aria-pressed={professionalMode} onClick={enterProfessionalMode}><span>通用模式</span><small>压缩与转换</small></button>
        </div>
        {!professionalMode ? (
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
      {editingItem && professionalMode && <ImageCropEditor item={editingItem} index={editingIndex} total={items.length} onClose={() => setEditingItemId(null)} onSave={saveCrop} onApplyAll={applyCropToAll} onNavigate={navigateCrop} />}
    </section>
  );
}
