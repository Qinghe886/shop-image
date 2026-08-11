'use client';

import { useState, useRef, useCallback } from 'react';
import { extractMetadata, stripExif, writeExif, type MetaGroup } from '@/lib/metadata';
import Link from 'next/link';

export default function MetadataPage() {
  const [tab, setTab] = useState<'read' | 'write'>('read');
  const [groups, setGroups] = useState<MetaGroup[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Write tab
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [stripping, setStripping] = useState(false);
  const [stripDone, setStripDone] = useState(0);
  const [singleFile, setSingleFile] = useState<File | null>(null);

  // ── Write tab: EXIF 写入 ──
  const [writeFile, setWriteFile] = useState<File | null>(null);
  const [artist, setArtist] = useState('');
  const [copyright, setCopyright] = useState('');
  const [description, setDescription] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [software, setSoftware] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [altitude, setAltitude] = useState('');
  const [writing, setWriting] = useState(false);
  const [writeDone, setWriteDone] = useState(false);

  // ── Read tab ──
  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setGroups([]);
    try {
      const result = await extractMetadata(file);
      setGroups(result);
    } catch { setGroups([{ label: '错误', items: [{ key: '解析', value: '无法读取元数据' }] }]); }
    finally { setLoading(false); }
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  // ── Write tab: batch strip ──
  const handleBatchFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setBatchFiles(files); setStripDone(0);
  };

  const batchStrip = async () => {
    setStripping(true); setStripDone(0);
    for (const file of batchFiles) {
      try {
        const blob = await stripExif(file);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace(/\.[^/.]+$/, '') + '_noexif.jpg';
        a.click();
        URL.revokeObjectURL(url);
        setStripDone((c) => c + 1);
      } catch { /* skip */ }
    }
    setStripping(false);
  };

  const singleStrip = async () => {
    if (!singleFile) return;
    setStripping(true);
    try {
      const blob = await stripExif(singleFile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = singleFile.name.replace(/\.[^/.]+$/, '') + '_noexif.jpg';
      a.click();
      URL.revokeObjectURL(url);
      setStripDone(1);
    } catch { alert('清除失败'); }
    setStripping(false);
  };

  const handleWriteExif = async () => {
    if (!writeFile) return;
    setWriting(true); setWriteDone(false);
    try {
      const blob = await writeExif(writeFile, {
        artist: artist || undefined,
        copyright: copyright || undefined,
        description: description || undefined,
        make: make || undefined,
        model: model || undefined,
        dateTime: dateTime || undefined,
        software: software || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        altitude: altitude ? parseFloat(altitude) : undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = writeFile.name.replace(/\.[^/.]+$/, '') + '_tagged.jpg';
      a.click();
      URL.revokeObjectURL(url);
      setWriteDone(true);
    } catch { alert('写入失败'); }
    setWriting(false);
  };

  return (
    <div className="meta-page">
      {/* Header */}
      <header className="meta-header">
        <Link href="/" className="meta-back">← 返回工具</Link>
        <h1 className="meta-title">图片元信息工具</h1>
        <span className="meta-badge">本地解析 · 不上传服务器</span>
      </header>

      {/* Tabs */}
      <div className="meta-tabs">
        <button className={tab === 'read' ? 'active' : ''} onClick={() => setTab('read')}>元信息解析（只读）</button>
        <button className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>EXIF 写入 / 批量清除</button>
      </div>

      {/* ── READ TAB ── */}
      {tab === 'read' && (
        <div className="meta-body">
          <section
            className={`meta-drop ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <span className="meta-drop-icon">{fileName ? '📄' : '📷'}</span>
            <p className="meta-drop-title">{fileName || '点击选择 / 拖拽 / 粘贴图片'}</p>
            <p className="meta-drop-hint">支持 JPG、PNG、WEBP、GIF、BMP · 提取 EXIF / IPTC / XMP / GPS</p>
            <input ref={fileRef} type="file" accept="image/*" className="meta-file-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </section>

          {loading && <p className="meta-loading">解析中...</p>}

          {!loading && groups.length > 0 && (
            <div className="meta-result">
              {groups.map((g, i) => (
                <div key={i} className="meta-card">
                  <h3 className="meta-card-title">{g.label}</h3>
                  <table>
                    <tbody>
                      {g.items.map((item, j) => (
                        <tr key={j}>
                          <td>{item.key}</td>
                          <td>{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── WRITE TAB ── */}
      {tab === 'write' && (
        <div className="meta-body">
          <div className="meta-notice">
            <strong>仅支持 JPEG（.jpg / .jpeg）</strong>
            <p>EXIF 是 JPEG/TIFF 规范的元数据格式。PNG、WEBP 等格式不使用 EXIF。全部处理在本地完成。</p>
          </div>

          {/* Batch strip */}
          <div className="meta-card">
            <div className="meta-card-head">
              <span>批量清除 EXIF</span>
              <small>拖入多张 JPEG，一键抹掉全部 EXIF（含 GPS 定位、机型、拍摄时间）</small>
            </div>
            <section
              className={`meta-drop meta-drop-sm ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setBatchFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => document.getElementById('batch-input')?.click()}
            >
              <span className="meta-drop-icon">📁</span>
              <p className="meta-drop-title">点击选择 / 拖拽多张 JPEG</p>
              <p className="meta-drop-hint">已选 {batchFiles.length} 张</p>
              <input id="batch-input" type="file" accept="image/jpeg" multiple className="meta-file-hidden" onChange={handleBatchFiles} />
            </section>
            {batchFiles.length > 0 && (
              <div className="meta-actions">
                <button className="meta-btn" onClick={batchStrip} disabled={stripping}>
                  {stripping ? '处理中...' : `清除全部 EXIF 并下载（${batchFiles.length} 张）`}
                </button>
                {stripDone > 0 && <p className="meta-done">已处理 {stripDone} / {batchFiles.length} 张</p>}
              </div>
            )}
          </div>

          {/* Single strip */}
          <div className="meta-card">
            <div className="meta-card-head">
              <span>单张 JPEG：选择性清除</span>
              <small>精确逐张处理，抹除敏感元数据后下载</small>
            </div>
            <div className="meta-actions">
              <button className="meta-btn meta-btn-outline" onClick={() => document.getElementById('single-input')?.click()}>
                {singleFile ? singleFile.name : '选择 JPEG 文件'}
              </button>
              <input id="single-input" type="file" accept="image/jpeg" className="meta-file-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSingleFile(f); }} />
              {singleFile && (
                <button className="meta-btn" onClick={singleStrip} disabled={stripping}>
                  {stripping ? '处理中...' : '清除 EXIF 并下载'}
                </button>
              )}
              {stripDone === 1 && <p className="meta-done">已完成</p>}
            </div>
          </div>

          {/* EXIF 写入 */}
          <div className="meta-card">
            <div className="meta-card-head">
              <span>写入 EXIF 信息</span>
              <small>为 JPEG 添加版权、作者、拍摄参数、GPS 位置等元数据。全部在本地完成，不上传。</small>
            </div>
            <div className="meta-form">
              <div className="meta-form-row">
                <button className="meta-btn meta-btn-outline" onClick={() => document.getElementById('write-input')?.click()}>
                  {writeFile ? writeFile.name : '选择 JPEG 文件'}
                </button>
                <input id="write-input" type="file" accept="image/jpeg" className="meta-file-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setWriteFile(f); setWriteDone(false); } }} />
              </div>

              <div className="meta-form-section-title">版权与描述</div>
              <div className="meta-form-row">
                <label>作者 / 摄影师</label>
                <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="例如：StorePic Works" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>版权信息</label>
                <input type="text" value={copyright} onChange={(e) => setCopyright(e.target.value)} placeholder="例如：© 2026 StorePic Works" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>图片描述</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="例如：春季新品 纯棉T恤 白色" className="meta-input" />
              </div>

              <div className="meta-form-section-title">拍摄信息</div>
              <div className="meta-form-row">
                <label>相机厂商</label>
                <input type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="例如：Canon" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>相机型号</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="例如：EOS R6 Mark II" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>处理软件</label>
                <input type="text" value={software} onChange={(e) => setSoftware(e.target.value)} placeholder="例如：Adobe Lightroom" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>拍摄时间</label>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} className="meta-input" />
              </div>

              <div className="meta-form-section-title">GPS 位置</div>
              <div className="meta-form-row">
                <label>纬度（正=北纬，负=南纬，例如：31.2304）</label>
                <input type="text" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="例如：31.2304（北纬 31.23°）" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>经度（正=东经，负=西经，例如：121.4737）</label>
                <input type="text" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="例如：121.4737（东经 121.47°）" className="meta-input" />
              </div>
              <div className="meta-form-row">
                <label>海拔（米）</label>
                <input type="text" value={altitude} onChange={(e) => setAltitude(e.target.value)} placeholder="例如：4.5" className="meta-input" />
              </div>

              <div className="meta-actions">
                <button className="meta-btn" onClick={handleWriteExif} disabled={!writeFile || writing}>
                  {writing ? '写入中...' : '写入 EXIF 并下载'}
                </button>
                {writeDone && <p className="meta-done">写入完成 ✓</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
