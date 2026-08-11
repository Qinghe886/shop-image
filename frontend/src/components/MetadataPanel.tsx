'use client';

import { useState } from 'react';
import { extractMetadata, stripExif, type MetaGroup } from '@/lib/metadata';

export default function MetadataPanel() {
  const [groups, setGroups] = useState<MetaGroup[]>([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stripping, setStripping] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [stripCount, setStripCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    setFileName(file.name);
    setFileSize(file.size);
    setCurrentFile(file);
    setLoading(true);
    const result = await extractMetadata(file);
    setGroups(result);
    setLoading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const f = e.clipboardData.files[0];
    if (f) handleFile(f);
  }

  async function handleStrip() {
    if (!currentFile) return;
    setStripping(true);
    try {
      const blob = await stripExif(currentFile);
      const ext = currentFile.name.includes('.') ? currentFile.name.split('.').pop() : 'jpg';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentFile.name.replace(/\.[^/.]+$/, '') + '_noexif.' + ext;
      a.click();
      URL.revokeObjectURL(url);
      setStripCount((c) => c + 1);
    } catch (err) {
      alert('清除失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setStripping(false);
    }
  }

  const isJpeg = currentFile?.type === 'image/jpeg';

  return (
    <div className="meta-panel" onPaste={handlePaste} tabIndex={0} style={{ outline: 'none' }}>
      {/* Drop zone */}
      <section
        className={`meta-drop ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        tabIndex={0}
        aria-label="点击选择、拖拽或粘贴图片"
      >
        <span className="meta-drop-icon">📷</span>
        <p className="meta-drop-title">{fileName || '点击选择 / 拖拽 / 粘贴 图片'}</p>
        <p className="meta-drop-hint">
          支持 JPG、PNG、WEBP、GIF、BMP，可提取 EXIF/IPTC/XMP 元数据、GPS 位置与 PNG 隐藏文本
        </p>
        <input type="file" accept="image/*" className="meta-file-input" onChange={handleChange} />
      </section>

      {/* Loading */}
      {loading && <div className="meta-loading">解析中...</div>}

      {/* Metadata display */}
      {!loading && groups.length > 0 && (
        <div className="meta-result">
          {groups.map((group, gi) => (
            <div key={gi} className="meta-group">
              <h3 className="meta-group-title">{group.label}</h3>
              <table className="meta-table">
                <tbody>
                  {group.items.map((item, ii) => (
                    <tr key={ii} className="meta-row">
                      <td className="meta-key">{item.key}</td>
                      <td className="meta-value">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Actions */}
          <div className="meta-actions">
            {isJpeg && (
              <button
                className="meta-btn meta-btn-primary"
                onClick={handleStrip}
                disabled={stripping}
              >
                {stripping ? '处理中...' : '清除 EXIF 并下载'}
              </button>
            )}
            {!isJpeg && currentFile && (
              <p className="meta-note">⚠ EXIF 清除仅支持 JPEG 格式。PNG/WEBP 等格式可通过"图片处理"标签页重新导出为 JPEG 来间接去除元数据。</p>
            )}
            {stripCount > 0 && (
              <p className="meta-count">已清除 {stripCount} 张图片的 EXIF 信息</p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && fileName && (
        <p className="meta-empty">该图片未检测到元数据</p>
      )}
    </div>
  );
}
