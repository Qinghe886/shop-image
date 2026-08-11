/**
 * 图片元信息提取 & 清除（纯浏览器端，零上传）
 * 依赖 exifr 解析 EXIF/IPTC/XMP/GPS
 */
import exifr from 'exifr';
import piexif from 'piexifjs';

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
    groups.push({ label: '相机信息', items: [
      { key: '相机制造商', value: data.Make ? String(data.Make) : '无' },
      { key: '相机型号', value: data.Model ? String(data.Model) : '无' },
      { key: '镜头型号', value: data.LensModel ? String(data.LensModel) : '无' },
      { key: '处理软件', value: data.Software ? String(data.Software) : '无' },
    ]});

    // 拍摄参数
    groups.push({ label: '拍摄参数', items: [
      { key: '拍摄时间', value: data.DateTimeOriginal ? formatDate(data.DateTimeOriginal) : '无' },
      { key: '曝光时间', value: data.ExposureTime ? formatExposure(data.ExposureTime) : '无' },
      { key: '光圈', value: data.FNumber ? 'f/' + data.FNumber : '无' },
      { key: 'ISO', value: data.ISO ? String(data.ISO) : '无' },
      { key: '焦距', value: data.FocalLength ? data.FocalLength + 'mm' : '无' },
      { key: '闪光灯', value: data.Flash !== undefined ? formatFlash(data.Flash) : '无' },
      { key: '曝光补偿', value: data.ExposureCompensation !== undefined ? data.ExposureCompensation + ' EV' : '无' },
    ]});

    // 图片属性
    groups.push({ label: '图片属性', items: [
      { key: '尺寸', value: (data.ImageWidth && data.ImageHeight) ? data.ImageWidth + ' × ' + data.ImageHeight + ' px' : '未知' },
      { key: '色彩空间', value: data.ColorSpace ? (typeof data.ColorSpace === 'number' ? (data.ColorSpace === 1 ? 'sRGB' : 'Adobe RGB') : String(data.ColorSpace)) : '无' },
    ]});

    // GPS 位置
    groups.push({ label: 'GPS 位置', items: [
      { key: '纬度', value: data.latitude !== undefined ? data.latitude.toFixed(6) : '无' },
      { key: '经度', value: data.longitude !== undefined ? data.longitude.toFixed(6) : '无' },
      { key: '海拔', value: data.GPSAltitude !== undefined ? data.GPSAltitude.toFixed(1) + 'm' : '无' },
    ]});

    // 版权 & 作者
    groups.push({ label: '版权与作者', items: [
      { key: '版权', value: data.Copyright ? String(data.Copyright) : '无' },
      { key: '作者', value: data.Artist ? String(data.Artist) : '无' },
      { key: '描述', value: data.ImageDescription ? String(data.ImageDescription) : '无' },
    ]});

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
/** 写入 EXIF 字段（版权/作者/描述/GPS/拍摄信息）*/
export async function writeExif(
  file: File,
  fields: {
    artist?: string;
    copyright?: string;
    description?: string;
    // 拍摄信息
    make?: string;
    model?: string;
    dateTime?: string;       // "YYYY:MM:DD HH:MM:SS" 或 Date
    software?: string;
    // GPS
    latitude?: number;       // 十进制，正=北纬 负=南纬
    longitude?: number;      // 十进制，正=东经 负=西经
    altitude?: number;       // 米
  },
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const jpeg = reader.result as string;
        // 先清除旧 EXIF，避免双重 APP1 段导致图片损坏
        const cleanJpeg = piexif.remove(jpeg);
        const exifObj: any = { '0th': {}, Exif: {}, GPS: {} };

        // ── 0th IFD ──
        if (fields.make) exifObj['0th'][piexif.ImageIFD.Make] = fields.make;
        if (fields.model) exifObj['0th'][piexif.ImageIFD.Model] = fields.model;
        if (fields.software) exifObj['0th'][piexif.ImageIFD.Software] = fields.software;
        if (fields.artist) exifObj['0th'][piexif.ImageIFD.Artist] = fields.artist;
        if (fields.copyright) exifObj['0th'][piexif.ImageIFD.Copyright] = fields.copyright;
        if (fields.description) exifObj['0th'][piexif.ImageIFD.ImageDescription] = fields.description;
        if (fields.dateTime) {
          const dt = formatExifDateTime(fields.dateTime);
          exifObj['0th'][piexif.ImageIFD.DateTime] = dt;
        }

        // ── Exif IFD ──
        if (fields.dateTime) {
          const dt = formatExifDateTime(fields.dateTime);
          exifObj['Exif'][piexif.ExifIFD.DateTimeOriginal] = dt;
        }

        // ── GPS IFD ──
        if (fields.latitude !== undefined) {
          const lat = fields.latitude;
          exifObj['GPS'][piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
          exifObj['GPS'][piexif.GPSIFD.GPSLatitude] = decimalToRational(Math.abs(lat));
        }
        if (fields.longitude !== undefined) {
          const lon = fields.longitude;
          exifObj['GPS'][piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? 'E' : 'W';
          exifObj['GPS'][piexif.GPSIFD.GPSLongitude] = decimalToRational(Math.abs(lon));
        }
        if (fields.altitude !== undefined) {
          const alt = fields.altitude;
          exifObj['GPS'][piexif.GPSIFD.GPSAltitudeRef] = alt >= 0 ? 0 : 1;
          exifObj['GPS'][piexif.GPSIFD.GPSAltitude] = [Math.round(Math.abs(alt) * 100), 100];
        }

        // 没有 GPS 数据就不要 GPS 段
        if (Object.keys(exifObj.GPS).length === 0) delete exifObj.GPS;

        const exifBytes = piexif.dump(exifObj);
        const newJpeg = piexif.insert(exifBytes, cleanJpeg);
        const arr = new Uint8Array(newJpeg.length);
        for (let i = 0; i < newJpeg.length; i++) arr[i] = newJpeg.charCodeAt(i) & 0xff;
        resolve(new Blob([arr], { type: 'image/jpeg' }));
      } catch (e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('读取失败'));
    reader.readAsDataURL(file);
  });
}

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

// ── 写入辅助 ──

/** 十进制角度 → EXIF 有理数数组 [[度], [分], [秒]] */
function decimalToRational(degrees: number): [number, number][] {
  const d = Math.floor(degrees);
  const m = Math.floor((degrees - d) * 60);
  const s = Math.round((degrees - d - m / 60) * 3600 * 100);
  return [
    [d, 1],
    [m, 1],
    [s, 100],
  ];
}

/** 格式化 EXIF 日期字符串 "YYYY:MM:DD HH:MM:SS" */
function formatExifDateTime(val: Date | string): string {
  const d = typeof val === 'string' ? new Date(val) : val;
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${Y}:${M}:${D} ${h}:${m}:${s}`;
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
