import { fmt } from './core.js?v=42';

function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/£/g, '\\243')
    .replace(/[^\x20-\x7E]/g, '?');
}

export function buildStatement({title, account, from, to, opening, closing, rows}) {
  const c = [];
  const put = (f, size, x, y, text) => {
    c.push('BT /' + f + ' ' + size + ' Tf 1 0 0 1 ' + x + ' ' + y + ' Tm (' + esc(text) + ') Tj ET');
  };
  const rule = (y) => c.push('0.7 w 50 ' + y + ' m 545 ' + y + ' l S');

  put('F1', 20, 50, 795, 'Monzo');
  put('F2', 10, 50, 777, account);
  put('F1', 13, 50, 750, title);
  put('F2', 9, 50, 736, 'Period ' + from + ' to ' + to);
  put('F2', 9, 50, 722, 'Opening balance ' + fmt(opening));
  put('F2', 9, 420, 722, 'Closing balance ' + fmt(closing));
  rule(712);

  let y = 694;
  put('F1', 8.5, 50, y, 'Date');
  put('F1', 8.5, 110, y, 'Description');
  put('F1', 8.5, 360, y, 'Category');
  put('F1', 8.5, 450, y, 'Amount');
  put('F1', 8.5, 510, y, 'Balance');
  rule(y - 5);
  y -= 18;

  let running = opening;
  const max = 44;
  for (const t of rows.slice(0, max)) {
    running = Math.round((running + t.amount) * 100) / 100;
    put('F2', 8.5, 50, y, new Date(t.ts).toLocaleDateString('en-GB'));
    put('F2', 8.5, 110, y, String(t.name).slice(0, 40));
    put('F2', 8.5, 360, y, String(t.category).slice(0, 14));
    put('F2', 8.5, 450, y, fmt(t.amount));
    put('F2', 8.5, 510, y, fmt(running));
    y -= 13.5;
    if (y < 78) break;
  }
  if (rows.length > max) put('F2', 8, 50, y, '... and ' + (rows.length - max) + ' more');

  rule(58);
  put('F2', 7.5, 50, 46, 'Monzo Bank Limited. Generated ' + new Date().toLocaleString('en-GB'));
  put('F2', 7.5, 50, 35, 'Every amount is in pounds sterling.');

  const content = c.join('\n');

  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += (i + 1) + ' 0 obj\n' + o + '\nendobj\n';
  });
  const xref = pdf.length;
  pdf += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  pdf += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';

  return new Blob([pdf], { type: 'application/pdf' });
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
