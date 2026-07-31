'use client';

import Cropper, { Area, Point, Size } from 'react-easy-crop';
import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderCroppedCanvas } from '@/lib/image';
import type { CropAspect, CropSettings, ImageItem } from '@/lib/types';

const aspectValues: Record<CropAspect, number | undefined> = {
  free: undefined,
  '1:1': 1,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '16:9': 16 / 9,
};

type FreeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type FreeResizeState = { handle: FreeHandle; x: number; y: number; width: number; height: number };

function initialSettings(item: ImageItem): CropSettings {
  return item.crop ?? {
    aspect: 'free',
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    zoom: 1,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
  };
}

interface ImageCropEditorProps {
  item: ImageItem;
  index: number;
  total: number;
  onClose: () => void;
  onSave: (crop: CropSettings) => void;
  onApplyAll: (crop: CropSettings) => void;
  onNavigate: (direction: -1 | 1) => void;
}

export default function ImageCropEditor({ item, index, total, onClose, onSave, onApplyAll, onNavigate }: ImageCropEditorProps) {
  const cropStageRef = useRef<HTMLDivElement>(null);
  const freeResizeRef = useRef<FreeResizeState | null>(null);
  const [settings, setSettings] = useState<CropSettings>(() => initialSettings(item));
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(settings.zoom || 1);
  const [croppedArea, setCroppedArea] = useState<Area>({ x: 0, y: 0, width: 100, height: 100 });
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [editorUrl, setEditorUrl] = useState(item.previewUrl);
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaSize, setMediaSize] = useState({ width: 1, height: 1 });
  const [freeCropPercent, setFreeCropPercent] = useState({ width: 100, height: 100 });
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [mediaBounds, setMediaBounds] = useState<Size>({ width: 1, height: 1 });

  const aspect = aspectValues[settings.aspect];
  const freeCropSize = useMemo<Size>(() => {
    const maxWidth = Math.max(100, mediaBounds.width);
    const maxHeight = Math.max(100, mediaBounds.height);
    return {
      width: Math.max(80, maxWidth * freeCropPercent.width / 100),
      height: Math.max(80, maxHeight * freeCropPercent.height / 100),
    };
  }, [freeCropPercent, mediaBounds]);

  useEffect(() => {
    const next = initialSettings(item);
    setSettings(next);
    setPosition({ x: 0, y: 0 });
    setZoom(next.zoom || 1);
    setView('edit');
  }, [item]);

  useEffect(() => {
    let disposed = false;
    let url = '';
    const transformOnly: CropSettings = {
      aspect: 'free',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      zoom: 1,
      rotation: settings.rotation,
      flipHorizontal: settings.flipHorizontal,
      flipVertical: settings.flipVertical,
    };
    renderCroppedCanvas(item.file, transformOnly, 2200).then((canvas) => canvas.toBlob((blob) => {
      if (!blob || disposed) return;
      url = URL.createObjectURL(blob);
      setEditorUrl(url);
      setMediaSize({ width: canvas.width, height: canvas.height });
    }, 'image/png'));
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.file, settings.flipHorizontal, settings.flipVertical, settings.rotation]);

  const normalizedSettings = useMemo<CropSettings>(() => ({
    ...settings,
    x: Math.max(0, Math.min(1, croppedArea.x / 100)),
    y: Math.max(0, Math.min(1, croppedArea.y / 100)),
    width: Math.max(0.0001, Math.min(1, croppedArea.width / 100)),
    height: Math.max(0.0001, Math.min(1, croppedArea.height / 100)),
    zoom,
  }), [croppedArea, settings, zoom]);

  useEffect(() => {
    const stage = cropStageRef.current;
    if (!stage) return;
    function updateStageSize() {
      if (!stage) return;
      const bounds = stage.getBoundingClientRect();
      setStageSize({ width: Math.max(400, bounds.width), height: Math.max(300, bounds.height) });
    }
    updateStageSize();
    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    function handleFreeResize(event: globalThis.PointerEvent) {
      const state = freeResizeRef.current;
      if (!state || !stageSize) return;
      event.preventDefault();
      const dx = (event.clientX - state.x) / Math.max(mediaBounds.width, 1) * 200;
      const dy = (event.clientY - state.y) / Math.max(mediaBounds.height, 1) * 200;
      let width = state.width;
      let height = state.height;
      if (state.handle.includes('e')) width += dx;
      if (state.handle.includes('w')) width -= dx;
      if (state.handle.includes('s')) height += dy;
      if (state.handle.includes('n')) height -= dy;
      setFreeCropPercent({ width: Math.max(20, Math.min(100, width)), height: Math.max(20, Math.min(100, height)) });
    }
    function stopFreeResize() {
      freeResizeRef.current = null;
    }
    window.addEventListener('pointermove', handleFreeResize, { passive: false });
    window.addEventListener('pointerup', stopFreeResize);
    window.addEventListener('pointercancel', stopFreeResize);
    return () => {
      window.removeEventListener('pointermove', handleFreeResize);
      window.removeEventListener('pointerup', stopFreeResize);
      window.removeEventListener('pointercancel', stopFreeResize);
    };
  }, [mediaBounds.height, mediaBounds.width, stageSize]);

  useEffect(() => {
    if (view !== 'preview') return;
    let disposed = false;
    let url = '';
    renderCroppedCanvas(item.file, normalizedSettings, 1400).then((canvas) => canvas.toBlob((blob) => {
      if (!blob || disposed) return;
      url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }, 'image/png'));
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.file, normalizedSettings, view]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (view !== 'edit' || event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      const step = event.shiftKey ? 5 : 1;
      const movement: Partial<Point> = {};
      if (event.key === 'ArrowLeft') movement.x = position.x - step;
      else if (event.key === 'ArrowRight') movement.x = position.x + step;
      else if (event.key === 'ArrowUp') movement.y = position.y - step;
      else if (event.key === 'ArrowDown') movement.y = position.y + step;
      else return;
      event.preventDefault();
      setPosition((current) => ({ ...current, ...movement }));
    }
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [onClose, position.x, position.y, view]);

  const handleCropComplete = useCallback((area: Area) => setCroppedArea(area), []);

  function startFreeResize(event: ReactPointerEvent<HTMLButtonElement>, handle: FreeHandle) {
    event.preventDefault();
    event.stopPropagation();
    freeResizeRef.current = { handle, x: event.clientX, y: event.clientY, width: freeCropPercent.width, height: freeCropPercent.height };
  }

  function selectAspect(value: CropAspect) {
    setSettings((current) => ({ ...current, aspect: value }));
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    if (value === 'free') setFreeCropPercent({ width: 100, height: 100 });
  }

  function rotate(amount: -90 | 90) {
    setSettings((current) => ({ ...current, rotation: ((current.rotation + amount + 360) % 360) as CropSettings['rotation'] }));
    setPosition({ x: 0, y: 0 });
  }

  function reset() {
    setSettings(initialSettings({ ...item, crop: undefined }));
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    setView('edit');
  }

  return (
    <div className="crop-modal" role="dialog" aria-modal="true" aria-label={`裁切 ${item.name}`}>
      <button type="button" className="crop-backdrop" aria-label="关闭裁切编辑器" onClick={onClose} />
      <div className="crop-dialog">
        <header className="crop-header">
          <div><small>可视化裁切</small><strong>{item.name}</strong><span>{index + 1} / {total}</span></div>
          <div className="crop-header-actions"><button type="button" disabled={index === 0} onClick={() => onNavigate(-1)}>上一张</button><button type="button" disabled={index === total - 1} onClick={() => onNavigate(1)}>下一张</button><button type="button" className="crop-close" onClick={onClose}>关闭</button></div>
        </header>

        <div className="crop-content">
          <div className="crop-workspace">
            <div className="crop-view-tabs"><button type="button" className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>裁切编辑</button><button type="button" className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>结果预览</button></div>
            {view === 'edit' ? (
              <div ref={cropStageRef} className="crop-library-stage">
                <Cropper
                  image={editorUrl}
                  crop={position}
                  zoom={zoom}
                  aspect={aspect}
                  cropSize={settings.aspect === 'free' ? freeCropSize : undefined}
                  initialCroppedAreaPercentages={item.crop ? { x: item.crop.x * 100, y: item.crop.y * 100, width: item.crop.width * 100, height: item.crop.height * 100 } : undefined}
                  cropShape="rect"
                  showGrid
                  objectFit="contain"
                  restrictPosition
                  minZoom={1}
                  maxZoom={4}
                  zoomSpeed={0.12}
                  onCropChange={setPosition}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  onMediaLoaded={(size) => {
                    setMediaSize({ width: size.naturalWidth, height: size.naturalHeight });
                    const stageRatio = stageSize.width / Math.max(stageSize.height, 1);
                    const mediaRatio = size.naturalWidth / Math.max(size.naturalHeight, 1);
                    let displayWidth = stageSize.width;
                    let displayHeight = stageSize.width / mediaRatio;
                    if (displayHeight > stageSize.height) {
                      displayHeight = stageSize.height;
                      displayWidth = stageSize.height * mediaRatio;
                    }
                    setMediaBounds({ width: displayWidth, height: displayHeight });
                  }}
                  classes={{ containerClassName: 'storepic-crop-container', cropAreaClassName: settings.aspect === 'free' ? 'storepic-crop-area free' : 'storepic-crop-area fixed' }}
                />
                {settings.aspect === 'free' && <div className="free-resize-overlay" style={{ width: `${freeCropSize.width}px`, height: `${freeCropSize.height}px` }}>
                  {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as FreeHandle[]).map((handle) => <button type="button" tabIndex={-1} aria-label={`调整自由裁切区域 ${handle}`} key={handle} className={`free-resize-handle ${handle}`} onPointerDown={(event) => startFreeResize(event, handle)} />)}
                </div>}
              </div>
            ) : <div className="crop-preview">{previewUrl ? <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="裁切结果预览" />
            </> : <span>正在生成预览…</span>}</div>}
          </div>

          <aside className="crop-controls">
            <section><label>裁切比例</label><div className="crop-aspects">{(['free', '1:1', '4:5', '3:4', '16:9'] as CropAspect[]).map((value) => <button type="button" key={value} className={settings.aspect === value ? 'active' : ''} onClick={() => selectAspect(value)}>{value === 'free' ? '自由' : value}</button>)}</div><p className="crop-help">{settings.aspect === 'free' ? '拖动图片定位；拖动绿色手柄调整裁切框大小。' : `输出比例 ${settings.aspect}，拖动图片选择主体。`}</p></section>
            <section><div className="crop-control-title"><label htmlFor="crop-zoom">图片缩放</label><output>{Math.round(zoom * 100)}%</output></div><input id="crop-zoom" type="range" min="1" max="4" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />{settings.aspect === 'free' && <div className="crop-free-size"><div><span>裁切框宽度</span><input aria-label="自由裁切宽度" type="range" min="20" max="100" value={freeCropPercent.width} onChange={(event) => setFreeCropPercent((current) => ({ ...current, width: Number(event.target.value) }))} /></div><div><span>裁切框高度</span><input aria-label="自由裁切高度" type="range" min="20" max="100" value={freeCropPercent.height} onChange={(event) => setFreeCropPercent((current) => ({ ...current, height: Number(event.target.value) }))} /></div></div>}<div className="crop-dimensions">预览尺寸 {Math.round(mediaSize.width * normalizedSettings.width)} × {Math.round(mediaSize.height * normalizedSettings.height)} px</div></section>
            <section><label>旋转</label><div className="crop-action-grid"><button type="button" onClick={() => rotate(-90)}>↶ 左转 90°</button><button type="button" onClick={() => rotate(90)}>↷ 右转 90°</button></div></section>
            <section><label>翻转</label><div className="crop-action-grid"><button type="button" className={settings.flipHorizontal ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, flipHorizontal: !current.flipHorizontal }))}>水平翻转</button><button type="button" className={settings.flipVertical ? 'active' : ''} onClick={() => setSettings((current) => ({ ...current, flipVertical: !current.flipVertical }))}>垂直翻转</button></div></section>
            <button type="button" className="crop-reset" onClick={reset}>重置当前调整</button>
          </aside>
        </div>

        <footer className="crop-footer"><p>保存后，压缩和格式转换将使用裁切结果。</p><div><button type="button" onClick={onClose}>取消</button><button type="button" className="apply-all" onClick={() => onApplyAll(normalizedSettings)}>应用到全部</button><button type="button" className="save-crop" onClick={() => onSave(normalizedSettings)}>保存当前图片</button></div></footer>
      </div>
    </div>
  );
}
