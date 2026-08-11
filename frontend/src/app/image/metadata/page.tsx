'use client';

import { useState, useRef, useCallback } from 'react';
import { extractMetadata, stripExif, type MetaGroup } from '@/lib/metadata';
import Link from 'next/link';

function CameraIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>); }
function FileIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>); }
function FolderIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>); }
function ShieldIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>); }
function EyeIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>); }
function DownloadIcon() { return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="meta-svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>); }

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
  const [singleFile, setSingleFile] = useState<File | null>(null);

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

  const singleStrip = async () => {
    if (!singleFile) return; setStripping(true);
    try {
      const blob = await stripExif(singleFile);
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
            <span className="meta-drop-icon">{fileName ? <FileIcon /> : <CameraIcon />}</span>
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
