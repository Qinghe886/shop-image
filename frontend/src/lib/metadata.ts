/**
 * 图片元信息提取 & 清除（纯浏览器端，零上传）
 * 依赖 exifr 解析 EXIF/IPTC/XMP/GPS
 */
import exifr from 'exifr';

export interface MetaGroup {
  label: string;
  items: { key: string; value: string }[];
}

/** 解析图片元信息，按分组返回 */
export async function extractMetadata(file: File): Promise<MetaGroup[]> {
  const groups: MetaGroup[] = [];

  try {
    // 基础文件信息
    groups.push({
      label: '文件信息',
      items: [
        { key: '文件名', value: file.name },
        { key: '文件大小', value: formatSize(file.size) },
        { key: 'MIME 类型', value: file.type || '未知' },
      ],
    });

    // 使用 exifr 解析全部元数据
    const data = await exifr.parse(file, {
      gps: true,
      xmp: true,
      iptc: true,
      tiff: true,
      interop: true,
      icc: true,
    });

    if (!data) {
      groups.push({ label: '元信息', items: [{ key: '提示', value: '未检测到 EXIF/IPTC/XMP 元数据' }] });
      return groups;
    }

    // 相机信息
    const cameraItems: { key: string; value: string }[] = [];
    if (data.Make) cameraItems.push({ key: '相机制造商', value: String(data.Make) });
    if (data.Model) cameraItems.push({ key: '相机型号', value: String(data.Model) });
    if (data.LensModel) cameraItems.push({ key: '镜头型号', value: String(data.LensModel) });
    if (data.Software) cameraItems.push({ key: '处理软件', value: String(data.Software) });
    if (cameraItems.length > 0) groups.push({ label: '相机信息', items: cameraItems });

    // 拍摄参数
    const shootItems: { key: string; value: string }[] = [];
    if (data.DateTimeOriginal) shootItems.push({ key: '拍摄时间', value: formatDate(data.DateTimeOriginal) });
    if (data.CreateDate) shootItems.push({ key: '创建时间', value: formatDate(data.CreateDate) });
    if (data.ModifyDate) shootItems.push({ key: '修改时间', value: formatDate(data.ModifyDate) });
    if (data.ExposureTime) shootItems.push({ key: '曝光时间', value: formatExposure(data.ExposureTime) });
    if (data.FNumber) shootItems.push({ key: '光圈', value: 'f/' + data.FNumber });
    if (data.ISO) shootItems.push({ key: 'ISO', value: String(data.ISO) });
    if (data.FocalLength) shootItems.push({ key: '焦距', value: data.FocalLength + 'mm' });
    if (data.FocalLengthIn35mmFormat) shootItems.push({ key: '35mm 等效焦距', value: data.FocalLengthIn35mmFormat + 'mm' });
    if (data.Flash) shootItems.push({ key: '闪光灯', value: formatFlash(data.Flash) });
    if (data.WhiteBalance) shootItems.push({ key: '白平衡', value: typeof data.WhiteBalance === 'number' ? String(data.WhiteBalance) : String(data.WhiteBalance) });
    if (data.MeteringMode) shootItems.push({ key: '测光模式', value: String(data.MeteringMode) });
    if (data.ExposureCompensation !== undefined) shootItems.push({ key: '曝光补偿', value: data.ExposureCompensation + ' EV' });
    if (shootItems.length > 0) groups.push({ label: '拍摄参数', items: shootItems });

    // 图片属性
    const imgItems: { key: string; value: string }[] = [];
    if (data.ImageWidth && data.ImageHeight) imgItems.push({ key: '尺寸', value: data.ImageWidth + ' × ' + data.ImageHeight + ' px' });
    if (data.Orientation) imgItems.push({ key: '方向', value: String(data.Orientation) });
    if (data.ColorSpace) imgItems.push({ key: '色彩空间', value: typeof data.ColorSpace === 'number' ? (data.ColorSpace === 1 ? 'sRGB' : 'Adobe RGB') : String(data.ColorSpace) });
    if (imgItems.length > 0) groups.push({ label: '图片属性', items: imgItems });

    // GPS 位置
    if (data.latitude !== undefined && data.longitude !== undefined) {
      groups.push({
        label: 'GPS 位置',
        items: [
          { key: '纬度', value: data.latitude.toFixed(6) },
          { key: '经度', value: data.longitude.toFixed(6) },
          ...(data.GPSAltitude !== undefined ? [{ key: '海拔', value: data.GPSAltitude.toFixed(1) + 'm' }] : []),
        ],
      });
    }

    // 版权 & 作者
    const rightsItems: { key: string; value: string }[] = [];
    if (data.Copyright) rightsItems.push({ key: '版权', value: String(data.Copyright) });
    if (data.Artist) rightsItems.push({ key: '作者', value: String(data.Artist) });
    if (data.ImageDescription) rightsItems.push({ key: '描述', value: String(data.ImageDescription) });
    if (rightsItems.length > 0) groups.push({ label: '版权与作者', items: rightsItems });

    // PNG 文本块
    const pngItems: { key: string; value: string }[] = [];
    const raw = data as any;
    if (raw['PNG:Title']) pngItems.push({ key: '标题', value: raw['PNG:Title'] });
    if (raw['PNG:Description']) pngItems.push({ key: '描述', value: raw['PNG:Description'] });
    if (raw['PNG:Author']) pngItems.push({ key: '作者', value: raw['PNG:Author'] });
    if (raw['PNG:Copyright']) pngItems.push({ key: '版权', value: raw['PNG:Copyright'] });
    if (raw['PNG:CreationTime']) pngItems.push({ key: '创建时间', value: raw['PNG:CreationTime'] });
    if (raw['PNG:Software']) pngItems.push({ key: '软件', value: raw['PNG:Software'] });
    if (raw['PNG:Source']) pngItems.push({ key: '来源', value: raw['PNG:Source'] });
    if (pngItems.length > 0) groups.push({ label: 'PNG 文本信息', items: pngItems });

  } catch (err) {
    groups.push({ label: '错误', items: [{ key: '解析失败', value: err instanceof Error ? err.message : '未知错误' }] });
  }

  return groups;
}

/** 清除 JPEG 的 EXIF：重新编码到 canvas 再导出（无元数据） */
export async function stripExif(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas 不可用')); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('导出失败')), file.type || 'image/jpeg', 0.95);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

// ── 格式化辅助 ──

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(val: any): string {
  if (val instanceof Date) return val.toLocaleString('zh-CN');
  const s = String(val);
  // EXIF 日期格式: "2024:06:15 14:30:00"
  const m = s.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]}`;
  return s;
}

function formatExposure(val: any): string {
  if (typeof val === 'number') {
    if (val >= 1) return val + 's';
    return '1/' + Math.round(1 / val) + 's';
  }
  return String(val);
}

function formatFlash(val: any): string {
  const map: Record<number, string> = { 0: '未闪光', 1: '闪光', 5: '闪光（未检测到返回光）', 7: '闪光（检测到返回光）', 9: '闪光（强制）', 13: '闪光（强制，未检测到返回光）', 15: '闪光（强制，检测到返回光）', 16: '未闪光（强制）', 24: '未闪光（自动）', 25: '闪光（自动）', 29: '闪光（自动，未检测到返回光）', 31: '闪光（自动，检测到返回光）', 32: '无闪光功能', 65: '闪光（红眼消除）', 69: '闪光（红眼消除，未检测到返回光）', 71: '闪光（红眼消除，检测到返回光）', 73: '闪光（强制，红眼消除）', 77: '闪光（强制，红眼消除，未检测到返回光）', 79: '闪光（强制，红眼消除，检测到返回光）', 89: '闪光（自动，红眼消除）', 93: '闪光（自动，红眼消除，未检测到返回光）', 95: '闪光（自动，红眼消除，检测到返回光）' };
  if (typeof val === 'number') return map[val] || '未知 (' + val + ')';
  return String(val);
}
