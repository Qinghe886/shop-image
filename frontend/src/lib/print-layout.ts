/**
 * 冲印排版：将证件照排列到相纸上，含裁切参考线
 */

export interface LayoutGrid {
  cols: number;
  rows: number;
  total: number;
  marginX: number;
  marginY: number;
}

/** 计算在指定纸上能排多少张照片 */
export function calculateLayout(
  photoW: number,
  photoH: number,
  paperW: number,
  paperH: number,
  margin = 12,
): LayoutGrid {
  const cols = Math.floor((paperW - margin) / (photoW + margin));
  const rows = Math.floor((paperH - margin) / (photoH + margin));
  const totalWidth = cols * photoW + (cols + 1) * margin;
  const totalHeight = rows * photoH + (rows + 1) * margin;
  const marginX = Math.floor((paperW - totalWidth) / 2 + margin);
  const marginY = Math.floor((paperH - totalHeight) / 2 + margin);
  return {
    cols: Math.max(1, cols),
    rows: Math.max(1, rows),
    total: Math.max(1, cols) * Math.max(1, rows),
    marginX,
    marginY,
  };
}

/** 渲染排版画布 */
export function renderPrintLayout(
  sourceCanvas: HTMLCanvasElement,
  paperW: number,
  paperH: number,
  margin = 12,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = paperW;
  canvas.height = paperH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 不可用');

  // 白色底色
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, paperW, paperH);

  const photoW = sourceCanvas.width;
  const photoH = sourceCanvas.height;
  const layout = calculateLayout(photoW, photoH, paperW, paperH, margin);

  // 绘制照片网格
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      const x = layout.marginX + col * (photoW + margin);
      const y = layout.marginY + row * (photoH + margin);
      ctx.drawImage(sourceCanvas, x, y, photoW, photoH);
    }
  }

  // 裁切参考线（淡灰色虚线）
  ctx.strokeStyle = 'rgba(180,180,180,0.5)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let row = 0; row <= layout.rows; row++) {
    const y = layout.marginY + row * (photoH + margin) - margin / 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(paperW, y);
    ctx.stroke();
  }

  for (let col = 0; col <= layout.cols; col++) {
    const x = layout.marginX + col * (photoW + margin) - margin / 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, paperH);
    ctx.stroke();
  }

  // 右下角标注
  ctx.setLineDash([]);
  ctx.fillStyle = '#999';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(
    `${layout.cols}×${layout.rows} = ${layout.total}张`,
    paperW - 8,
    paperH - 6,
  );

  return canvas;
}
