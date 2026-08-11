'use client';

import { useState, useRef, useCallback } from 'react';
import { extractMetadata, stripExif, writeExif, type MetaGroup } from '@/lib/metadata';
import Link from 'next/link';

function CameraIcon() { return (<svg viewBox="0 0 48 48" fill="none" className="meta-svg"><rect x="6" y="12" width="36" height="26" rx="4" stroke="currentColor" strokeWidth="2.5"/><circle cx="24" cy="25" r="7" stroke="currentColor" strokeWidth="2.5"/><circle cx="24" cy="25" r="2.5" fill="currentColor"/><path d="M16 12l2-5h12l2 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>); }
function FileIcon() { return (<svg viewBox="0 0 48 48" fill="none" className="meta-svg"><rect x="10" y="4" width="28" height="40" rx="3" stroke="currentColor" strokeWidth="2.5"/><path d="M18 4v8a2 2 0 0 0 2 2h8" stroke="currentColor" strokeWidth="2.5" fill="currentColor" fillOpacity=".1"/><line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="30" x2="32" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="16" y1="36" x2="24" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>); }
function FolderIcon() { return (<svg viewBox="0 0 48 48" fill="none" className="meta-svg"><path d="M6 12a3 3 0 0 1 3-3h10l4 4h16a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V12z" stroke="currentColor" strokeWidth="2.5"/></svg>); }
function SearchIcon() { return (<svg viewBox="0 0 48 48" fill="none" className="meta-svg"><circle cx="22" cy="22" r="13" stroke="currentColor" strokeWidth="2.5"/><line x1="32" y1="32" x2="42" y2="42" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>); }
function ShieldIcon() { return (<svg viewBox="0 0 48 48" fill="none" className="meta-svg"><path d="M24 4L8 12v12c0 12 16 20 16 20s16-8 16-20V12L24 4z" stroke="currentColor" strokeWidth="2.5"/><path d="M17 23l5 5 9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }

export default function MetadataPage() {
  const [tab, setTab] = useState<'read' | 'write'>('read');
  const [groups, setGroups] = useState<MetaGroup[]>([]);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [stripping, setStripping] = useState(false);
  const [stripDone, setStripDone] = useState(0);
  const [writeFile, setWriteFile] = useState<File | null>(null);
  const [artist, setArtist] = useState('');
  const [copyright, setCopyright] = useState('');
  const [description, setDescription] = useState('');
  const [writing, setWriting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    setGroups([]);
    try { const result = await extractMetadata(file); setGroups(result); }
    catch { setGroups([{ label: '错误', items: [{ key: '解析', value: '无法读取元数据' }] }]); }
    finally { setLoading(false); }
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  const batchStrip = async () => {
    setStripping(true); setStripDone(0);
    for (const file of batchFiles) {
      try {
        const blob = await stripExif(file);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = file.name.replace(/\.[^/.]+$/, '') + '_已清除隐私.jpg'; a.click();
        URL.revokeObjectURL(url); setStripDone((c) => c + 1);
      } catch { /* skip */ }
    }
    setStripping(false);
  };

  const handleWrite = async () => {
    if (!writeFile) return; setWriting(true);
    try {
      const blob = await writeExif(writeFile, { artist, copyright, description });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = writeFile.name.replace(/\.[^/.]+$/, '') + '_已写入.jpg'; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('写入失败'); }
    setWriting(false);
  };

  const singleStrip = async () => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = singleFile.name.replace(/\.[^/.]+$/, '') + '_已清除隐私.jpg'; a.click();
      URL.revokeObjectURL(url); setStripDone(1);
    } catch { alert('清除失败'); }
    setStripping(false);
  };

  return (
    <div className="meta-page">
      <header className="meta-header">
        <Link href="/image" className="meta-back">← 返回工具</Link>
        <h1 className="meta-title">清除照片信息</h1>
        <span className="meta-badge">本地处理 · 不上传服务器</span>
      </header>

      <div className="meta-tabs">
        <button className={tab === 'read' ? 'active' : ''} onClick={() => setTab('read')}>查看照片信息</button>
        <button className={tab === 'write' ? 'active' : ''} onClick={() => setTab('write')}>去除隐私数据</button>
      </div>

      {tab === 'read' && (
        <div className="meta-body">
          <section
            className={`meta-drop ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <span className="meta-drop-icon">{fileName ? <SearchIcon /> : <CameraIcon />}</span>
            <p className="meta-drop-title">{fileName || '点击选择 / 拖拽 / 粘贴照片'}</p>
            <p className="meta-drop-hint">查看照片中隐藏的拍摄时间、GPS位置、相机型号等信息</p>
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
                        <tr key={j}><td>{item.key}</td><td>{item.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'write' && (
        <div className="meta-body">
          <div className="meta-notice">
            <strong>照片里藏着什么？</strong>
            <p>用手机或相机拍的照片会自动记录 GPS 位置、拍摄时间、设备型号等隐私信息。分享原图就等于公开这些数据。以下工具帮你一键清除。</p>
          </div>

          <div className="meta-card">
            <div className="meta-card-head">
              <span>批量去除（多张照片）</span>
              <small>拖入多张照片，一键清除所有隐私数据后打包下载</small>
            </div>
            <section
              className={`meta-drop meta-drop-sm ${dragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); setBatchFiles(Array.from(e.dataTransfer.files)); }}
              onClick={() => document.getElementById('batch-input')?.click()}
            >
              <span className="meta-drop-icon"><FolderIcon /></span>
              <p className="meta-drop-title">点击选择 / 拖拽多张照片</p>
              <p className="meta-drop-hint">已选 {batchFiles.length} 张</p>
              <input id="batch-input" type="file" accept="image/jpeg" multiple className="meta-file-hidden" onChange={(e) => setBatchFiles(Array.from(e.target.files || []))} />
            </section>
            {batchFiles.length > 0 && (
              <div className="meta-actions">
                <button className="meta-btn" onClick={batchStrip} disabled={stripping}>
                  {stripping ? '处理中...' : `清除隐私数据并下载（${batchFiles.length} 张）`}
                </button>
                {stripDone > 0 && <p className="meta-done">已处理 {stripDone} / {batchFiles.length} 张</p>}
              </div>
            )}
          </div>

          <div className="meta-card">
            <div className="meta-card-head">
              <span>写入版权信息</span>
              <small>选择 JPEG 照片，添加作者、版权、描述后下载</small>
            </div>
            <div className="meta-actions">
              <button className="meta-btn meta-btn-outline" onClick={() => document.getElementById('write-input')?.click()}>
                {writeFile ? writeFile.name : '选择 JPEG 照片'}
              </button>
              <input id="write-input" type="file" accept="image/jpeg" className="meta-file-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setWriteFile(f); }} />
            </div>
            {writeFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <input className="meta-input" placeholder="作者（如：张三）" value={artist} onChange={(e) => setArtist(e.target.value)} />
                <input className="meta-input" placeholder="版权（如：© 2026 张三 保留所有权利）" value={copyright} onChange={(e) => setCopyright(e.target.value)} />
                <input className="meta-input" placeholder="描述（如：产品白底图）" value={description} onChange={(e) => setDescription(e.target.value)} />
                <button className="meta-btn" onClick={handleWrite} disabled={writing}>{writing ? '写入中...' : '写入并下载'}</button>
              </div>
            )}
          </div>

          <div className="meta-card">
            <div className="meta-card-head">
              <span>单张去除</span>
              <small>选择一张照片，精准清除后下载</small>
            </div>
            <div className="meta-actions">
              <button className="meta-btn meta-btn-outline" onClick={() => document.getElementById('single-input')?.click()}>
                {singleFile ? singleFile.name : '选择照片'}
              </button>
              <input id="single-input" type="file" accept="image/jpeg" className="meta-file-hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSingleFile(f); }} />
              {singleFile && (
                <button className="meta-btn" onClick={singleStrip} disabled={stripping}>
                  {stripping ? '处理中...' : '清除隐私数据并下载'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
