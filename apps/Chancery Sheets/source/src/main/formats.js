/*
 * File format readers and writers.
 *
 *   .spst          native: gzip-compressed JSON of the full document (lossless, includes charts)
 *   .xlsx / .xlsm  ExcelJS (values, formulas, styles, merges, sizes, freeze panes, autofilter);
 *                  .xlsm keeps the original VBA project so macros survive a round-trip
 *   .xls / .ods    SheetJS (values, formulas where supported, number formats, merges, sizes)
 *   .csv / .tsv    built-in RFC 4180 parser/writer (active sheet, formatted values)
 */
const path = require('path');
const zlib = require('zlib');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const JSZip = require('jszip');
const M = require('../shared/model');

const FORMATS = {
  spst: { label: 'Chancery Sheets Spreadsheet', lossy: [] },
  xlsx: { label: 'Excel Workbook', lossy: ['charts'] },
  xlsm: { label: 'Excel Macro-Enabled Workbook', lossy: ['charts'] },
  xls: { label: 'Excel 97-2003 Workbook', lossy: ['charts', 'cell styling (fonts, colors, borders)', 'freeze panes'] },
  ods: { label: 'OpenDocument Spreadsheet', lossy: ['charts', 'cell styling (fonts, colors, borders)', 'freeze panes'] },
  csv: { label: 'CSV (comma-separated)', lossy: ['all sheets except the active one', 'formulas (values are kept)', 'formatting', 'charts'] },
  tsv: { label: 'TSV (tab-separated)', lossy: ['all sheets except the active one', 'formulas (values are kept)', 'formatting', 'charts'] },
};

const extOf = (file) => path.extname(file).slice(1).toLowerCase();

/* ------------------------------------------------------------------ helpers */

const PX_PER_CHAR = 7;
const widthToPx = (w) => Math.round(w * PX_PER_CHAR + 5);
const pxToWidth = (px) => Math.max(0.5, (px - 5) / PX_PER_CHAR);
const ptToPx = (pt) => Math.round((pt * 4) / 3);
const pxToPt = (px) => (px * 3) / 4;

const THEME = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'];
const INDEXED = {
  0: '000000', 1: 'FFFFFF', 2: 'FF0000', 3: '00FF00', 4: '0000FF', 5: 'FFFF00', 6: 'FF00FF', 7: '00FFFF',
  8: '000000', 9: 'FFFFFF', 10: 'FF0000', 11: '00FF00', 12: '0000FF', 13: 'FFFF00', 14: 'FF00FF', 15: '00FFFF',
  16: '800000', 17: '008000', 18: '000080', 19: '808000', 20: '800080', 21: '008080', 22: 'C0C0C0', 23: '808080',
};

function applyTint(hex, tint) {
  if (!tint) return hex;
  const ch = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = ch.map((v) => (tint < 0 ? v * (1 + tint) : v + (255 - v) * tint));
  return out.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function xColorToHex(color) {
  if (!color) return null;
  let hex = null;
  if (color.argb) hex = color.argb.length === 8 ? color.argb.slice(2) : color.argb;
  else if (color.theme != null) hex = THEME[color.theme] || null;
  else if (color.indexed != null) hex = INDEXED[color.indexed] || null;
  if (!hex) return null;
  return '#' + applyTint(hex.toUpperCase(), color.tint).toLowerCase();
}

const hexToArgb = (hex) => 'FF' + String(hex).replace('#', '').toUpperCase().padStart(6, '0').slice(0, 6);

function cleanStyle(s) {
  for (const k of Object.keys(s)) if (s[k] == null || s[k] === false || s[k] === '') delete s[k];
  if (s.bd && Object.keys(s.bd).length === 0) delete s.bd;
  return Object.keys(s).length ? s : undefined;
}

/* --------------------------------------------------------------------- SPST */

function readSpst(buf) {
  const raw = buf[0] === 0x1f && buf[1] === 0x8b ? zlib.gunzipSync(buf) : buf;
  const doc = JSON.parse(raw.toString('utf8'));
  if (doc.format !== 'sheets-doc') throw new Error('This file is not a Chancery Sheets document.');
  return M.normalizeDoc(doc);
}

function writeSpst(doc) {
  const json = JSON.stringify(Object.assign({}, doc, { format: 'sheets-doc', version: 1, app: 'Chancery Sheets' }));
  return zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 6 });
}

/* ---------------------------------------------------------------- XLSX/XLSM */

function exceljsStyleToModel(cell) {
  const s = {};
  const f = cell.font;
  if (f) {
    if (f.bold) s.b = true;
    if (f.italic) s.i = true;
    if (f.underline) s.u = true;
    if (f.strike) s.st = true;
    if (f.name && f.name !== 'Calibri') s.ff = f.name;
    if (f.size && f.size !== 11) s.fs = f.size;
    const fc = xColorToHex(f.color);
    if (fc && fc !== '#000000') s.fc = fc;
  }
  const fill = cell.fill;
  if (fill && fill.type === 'pattern' && fill.pattern && fill.pattern !== 'none') {
    const bg = xColorToHex(fill.fgColor) || xColorToHex(fill.bgColor);
    if (bg) s.bg = bg;
  }
  const al = cell.alignment;
  if (al) {
    if (['left', 'center', 'right'].includes(al.horizontal)) s.ha = al.horizontal;
    else if (al.horizontal === 'centerContinuous') s.ha = 'center';
    if (al.vertical === 'top') s.va = 'top';
    else if (al.vertical === 'middle') s.va = 'middle';
    if (al.wrapText) s.wrap = true;
  }
  if (cell.numFmt && cell.numFmt !== 'General') s.nf = cell.numFmt;
  const b = cell.border;
  if (b) {
    const bd = {};
    for (const [side, k] of [['top', 't'], ['right', 'r'], ['bottom', 'b'], ['left', 'l']]) {
      if (b[side] && b[side].style) bd[k] = { style: b[side].style, color: xColorToHex(b[side].color) || '#000000' };
    }
    if (Object.keys(bd).length) s.bd = bd;
  }
  return cleanStyle(s);
}

function exceljsValueToCell(cell) {
  const val = cell.value;
  if (val == null) return null;
  const out = {};
  if (typeof val === 'number' || typeof val === 'boolean') out.v = val;
  else if (typeof val === 'string') out.v = val;
  else if (val instanceof Date) out.v = M.dateToSerial(val);
  else if (typeof val === 'object') {
    if (val.formula != null || val.sharedFormula != null) {
      let f = cell.formula || val.formula;
      if (f) out.f = String(f).replace(/^=/, '');
      let r = val.result;
      if (r instanceof Date) r = M.dateToSerial(r);
      if (r && typeof r === 'object' && r.error) { out.v = r.error; out.e = true; }
      else out.v = r === undefined ? null : r;
      if (!out.f) delete out.f;
    } else if (val.richText) out.v = val.richText.map((t) => t.text).join('');
    else if (val.hyperlink) out.v = val.text != null ? (typeof val.text === 'object' && val.text.richText ? val.text.richText.map((t) => t.text).join('') : String(val.text)) : val.hyperlink;
    else if (val.error) { out.v = val.error; out.e = true; }
    else out.v = String(cell.text || '');
  }
  return out;
}

async function readXlsx(buf, ext) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const doc = { format: 'sheets-doc', version: 1, activeSheet: 0, sheets: [] };
  wb.eachSheet((ws) => {
    const sh = M.emptySheet(ws.name);
    ws.eachRow({ includeEmpty: true }, (row, rn) => {
      const r = rn - 1;
      if (row.height && Math.abs(row.height - 15) > 0.01) sh.rowHeights[r] = ptToPx(row.height);
      if (row.hidden) sh.hiddenRows[r] = true;
      row.eachCell({ includeEmpty: false }, (cell, cn) => {
        if (cell.isMerged && cell.master !== cell) return;
        const c = cn - 1;
        const data = exceljsValueToCell(cell) || {};
        const s = exceljsStyleToModel(cell);
        if (s) data.s = s;
        if (data.v !== undefined || data.f || data.s) sh.cells[M.key(r, c)] = data;
      });
    });
    const colCount = Math.max(ws.columnCount || 0, ws.actualColumnCount || 0);
    for (let c = 1; c <= colCount; c++) {
      const col = ws.getColumn(c);
      if (col.width) sh.colWidths[c - 1] = widthToPx(col.width);
      if (col.hidden) sh.hiddenCols[c - 1] = true;
    }
    for (const m of (ws.model && ws.model.merges) || []) {
      const g = M.parseRange(m);
      if (g) sh.merges.push({ r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2 });
    }
    const view = (ws.views && ws.views[0]) || {};
    if (view.state === 'frozen') sh.freeze = { rows: view.ySplit || 0, cols: view.xSplit || 0 };
    if (view.showGridLines === false) sh.showGrid = false;
    if (ws.autoFilter) {
      const ref = typeof ws.autoFilter === 'string' ? ws.autoFilter : ws.autoFilter.ref ||
        (ws.autoFilter.from && ws.autoFilter.to ? `${ws.autoFilter.from}:${ws.autoFilter.to}` : null);
      const g = ref && M.parseRange(typeof ref === 'string' ? ref : '');
      if (g) sh.filter = { r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2, hidden: {} };
    }
    doc.sheets.push(sh);
  });
  if (doc.sheets.length === 0) doc.sheets.push(M.emptySheet('Sheet1'));
  const views = wb.views && wb.views[0];
  if (views && views.activeTab != null) doc.activeSheet = views.activeTab;

  const warnings = [];
  if (ext === 'xlsm') {
    const zip = await JSZip.loadAsync(buf);
    const vba = zip.file('xl/vbaProject.bin');
    if (vba) doc.vba = (await vba.async('nodebuffer')).toString('base64');
  } else {
    const zip = await JSZip.loadAsync(buf);
    if (zip.file(/^xl\/charts\//).length) warnings.push('Charts embedded in this workbook are not imported.');
  }
  return { doc: M.normalizeDoc(doc), warnings };
}

function modelStyleToExceljs(cell, s) {
  if (!s) return;
  const font = {};
  if (s.b) font.bold = true;
  if (s.i) font.italic = true;
  if (s.u) font.underline = true;
  if (s.st) font.strike = true;
  if (s.ff) font.name = s.ff;
  if (s.fs) font.size = s.fs;
  if (s.fc) font.color = { argb: hexToArgb(s.fc) };
  if (Object.keys(font).length) cell.font = font;
  if (s.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToArgb(s.bg) } };
  const al = {};
  if (s.ha) al.horizontal = s.ha;
  if (s.va) al.vertical = s.va;
  if (s.wrap) al.wrapText = true;
  if (Object.keys(al).length) cell.alignment = al;
  if (s.nf) cell.numFmt = s.nf;
  if (s.bd) {
    const border = {};
    for (const [side, k] of [['top', 't'], ['right', 'r'], ['bottom', 'b'], ['left', 'l']]) {
      if (s.bd[k]) border[side] = { style: s.bd[k].style || 'thin', color: { argb: hexToArgb(s.bd[k].color || '#000000') } };
    }
    cell.border = border;
  }
}

async function writeXlsx(doc, ext) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Chancery Sheets';
  wb.created = new Date();
  wb.views = [{ activeTab: doc.activeSheet || 0, x: 0, y: 0, width: 20000, height: 12000 }];
  for (const sh of doc.sheets) {
    const view = { showGridLines: sh.showGrid !== false };
    if (sh.freeze && (sh.freeze.rows || sh.freeze.cols)) {
      Object.assign(view, { state: 'frozen', xSplit: sh.freeze.cols || 0, ySplit: sh.freeze.rows || 0 });
    }
    const ws = wb.addWorksheet(sh.name, { views: [view] });
    for (const k in sh.cells) {
      const d = sh.cells[k];
      if (!d) continue;
      const [r, c] = M.parseKey(k);
      const cell = ws.getCell(r + 1, c + 1);
      if (d.f) {
        const result = d.e ? { error: d.v } : d.v == null ? undefined : d.v;
        cell.value = { formula: d.f, result };
      } else if (d.e) cell.value = { error: d.v };
      else if (d.v != null && d.v !== '') cell.value = d.v;
      modelStyleToExceljs(cell, d.s);
    }
    for (const c in sh.colWidths) ws.getColumn(+c + 1).width = pxToWidth(sh.colWidths[c]);
    for (const c in sh.hiddenCols || {}) if (sh.hiddenCols[c]) ws.getColumn(+c + 1).hidden = true;
    for (const r in sh.rowHeights) ws.getRow(+r + 1).height = pxToPt(sh.rowHeights[r]);
    for (const r in sh.hiddenRows || {}) if (sh.hiddenRows[r]) ws.getRow(+r + 1).hidden = true;
    for (const m of sh.merges) {
      if (m.r1 === m.r2 && m.c1 === m.c2) continue;
      ws.mergeCells(m.r1 + 1, m.c1 + 1, m.r2 + 1, m.c2 + 1);
    }
    if (sh.filter) ws.autoFilter = M.rangeStr(sh.filter);
  }
  let buf = Buffer.from(await wb.xlsx.writeBuffer());
  if (ext === 'xlsm') buf = await makeMacroEnabled(buf, doc.vba);
  return buf;
}

/** Convert an ExcelJS .xlsx package into a valid .xlsm package, re-attaching the VBA project if present. */
async function makeMacroEnabled(buf, vbaBase64) {
  const zip = await JSZip.loadAsync(buf);
  let ct = await zip.file('[Content_Types].xml').async('string');
  ct = ct.replace(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    'application/vnd.ms-excel.sheet.macroEnabled.main+xml'
  );
  if (vbaBase64) {
    if (!/Extension="bin"/.test(ct)) {
      ct = ct.replace('<Default ', '<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/><Default ');
    }
    zip.file('xl/vbaProject.bin', Buffer.from(vbaBase64, 'base64'));
    const relPath = 'xl/_rels/workbook.xml.rels';
    let rels = await zip.file(relPath).async('string');
    if (!/vbaProject/.test(rels)) {
      rels = rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdVbaProject1" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>'
      );
      zip.file(relPath, rels);
    }
    let wbXml = await zip.file('xl/workbook.xml').async('string');
    if (!/codeName=/.test(wbXml)) {
      wbXml = /<workbookPr\b/.test(wbXml)
        ? wbXml.replace(/<workbookPr\b/, '<workbookPr codeName="ThisWorkbook"')
        : wbXml.replace(/(<workbook\b[^>]*>)/, '$1<workbookPr codeName="ThisWorkbook"/>');
      zip.file('xl/workbook.xml', wbXml);
    }
  }
  zip.file('[Content_Types].xml', ct);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/* ------------------------------------------------------------------ XLS/ODS */

function readSheetJs(buf) {
  const wb = XLSX.read(buf, { type: 'buffer', cellFormula: true, cellNF: true, cellDates: false, cellStyles: true });
  const doc = { format: 'sheets-doc', version: 1, activeSheet: 0, sheets: [] };
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const sh = M.emptySheet(name);
    for (const a in ws) {
      if (a[0] === '!') continue;
      const p = M.parseAddr(a);
      if (!p) continue;
      const x = ws[a];
      const d = {};
      if (x.t === 'e') { d.v = x.w || '#N/A'; d.e = true; }
      else if (x.t === 'd') d.v = M.dateToSerial(new Date(x.v));
      else if (x.t === 'z') d.v = null;
      else d.v = x.v;
      if (x.f) d.f = String(x.f).replace(/^=/, '');
      if (x.z && x.z !== 'General') d.s = { nf: x.z };
      if (d.v === undefined) d.v = null;
      if (d.v == null && !d.f && !d.s) continue;
      sh.cells[M.key(p.r, p.c)] = d;
    }
    for (const m of ws['!merges'] || []) sh.merges.push({ r1: m.s.r, c1: m.s.c, r2: m.e.r, c2: m.e.c });
    (ws['!cols'] || []).forEach((col, c) => {
      if (!col) return;
      const px = col.wpx || (col.wch ? widthToPx(col.wch) : col.width ? widthToPx(col.width) : 0);
      if (px) sh.colWidths[c] = Math.round(px);
      if (col.hidden) sh.hiddenCols[c] = true;
    });
    (ws['!rows'] || []).forEach((row, r) => {
      if (!row) return;
      const px = row.hpx || (row.hpt ? ptToPx(row.hpt) : 0);
      if (px) sh.rowHeights[r] = Math.round(px);
      if (row.hidden) sh.hiddenRows[r] = true;
    });
    if (ws['!autofilter'] && ws['!autofilter'].ref) {
      const g = M.parseRange(ws['!autofilter'].ref);
      if (g) sh.filter = { r1: g.r1, c1: g.c1, r2: g.r2, c2: g.c2, hidden: {} };
    }
    doc.sheets.push(sh);
  }
  if (!doc.sheets.length) doc.sheets.push(M.emptySheet('Sheet1'));
  return { doc: M.normalizeDoc(doc), warnings: [] };
}

function writeSheetJs(doc, bookType) {
  const wb = XLSX.utils.book_new();
  for (const sh of doc.sheets) {
    const ws = {};
    let r2 = 0, c2 = 0, any = false;
    for (const k in sh.cells) {
      const d = sh.cells[k];
      if (!d) continue;
      const [r, c] = M.parseKey(k);
      if (d.v == null && !d.f && !(d.s && d.s.nf)) continue;
      const x = {};
      if (d.e) { x.t = 'e'; x.v = ERROR_CODES[d.v] != null ? ERROR_CODES[d.v] : 0x2a; x.w = d.v; }
      else if (typeof d.v === 'number') { x.t = 'n'; x.v = d.v; }
      else if (typeof d.v === 'boolean') { x.t = 'b'; x.v = d.v; }
      else if (d.v == null) { x.t = d.f ? 'n' : 'z'; if (d.f) x.v = 0; }
      else { x.t = 's'; x.v = String(d.v); }
      if (d.f) x.f = d.f;
      if (d.s && d.s.nf) x.z = d.s.nf;
      ws[M.addr(r, c)] = x;
      any = true;
      if (r > r2) r2 = r;
      if (c > c2) c2 = c;
    }
    for (const m of sh.merges) { r2 = Math.max(r2, m.r2); c2 = Math.max(c2, m.c2); }
    ws['!ref'] = any || sh.merges.length ? `A1:${M.addr(r2, c2)}` : 'A1';
    if (sh.merges.length) ws['!merges'] = sh.merges.map((m) => ({ s: { r: m.r1, c: m.c1 }, e: { r: m.r2, c: m.c2 } }));
    const cols = [];
    for (const c in sh.colWidths) cols[+c] = { wpx: sh.colWidths[c] };
    for (const c in sh.hiddenCols || {}) if (sh.hiddenCols[c]) cols[+c] = Object.assign(cols[+c] || {}, { hidden: true });
    if (cols.length) ws['!cols'] = cols;
    const rows = [];
    for (const r in sh.rowHeights) rows[+r] = { hpx: sh.rowHeights[r] };
    for (const r in sh.hiddenRows || {}) if (sh.hiddenRows[r]) rows[+r] = Object.assign(rows[+r] || {}, { hidden: true });
    if (rows.length) ws['!rows'] = rows;
    if (sh.filter) ws['!autofilter'] = { ref: M.rangeStr(sh.filter) };
    XLSX.utils.book_append_sheet(wb, ws, sh.name);
  }
  return XLSX.write(wb, { bookType, type: 'buffer', compression: true });
}

const ERROR_CODES = { '#NULL!': 0x00, '#DIV/0!': 0x07, '#VALUE!': 0x0f, '#REF!': 0x17, '#NAME?': 0x1d, '#NUM!': 0x24, '#N/A': 0x2a };

/* ------------------------------------------------------------------ CSV/TSV */

function decodeText(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.slice(2).toString('utf16le');
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    const sw = Buffer.from(buf.slice(2));
    sw.swap16();
    return sw.toString('utf16le');
  }
  let s = buf.toString('utf8');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);
  // Fall back to Latin-1 (Windows-1252 superset for most bytes) if the file is not valid UTF-8.
  if (s.includes('�') && !buf.includes(Buffer.from([0xef, 0xbf, 0xbd]))) s = buf.toString('latin1');
  return s;
}

function detectDelimiter(text) {
  const sample = text.slice(0, 20000).split(/\r?\n/).slice(0, 20);
  let best = ',', bestScore = -1;
  for (const d of [',', ';', '\t', '|']) {
    const counts = sample.filter((l) => l.length).map((l) => l.split(d).length - 1);
    if (!counts.length) continue;
    const min = Math.min(...counts);
    const score = min > 0 ? min * 10 + counts.filter((n) => n === counts[0]).length : 0;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

function parseDelimited(text, delim) {
  const rows = [];
  let row = [], field = '', i = 0, quoted = false, wasQuoted = false;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { quoted = true; wasQuoted = true; i++; continue; }
    if (ch === delim) { row.push({ t: field, q: wasQuoted }); field = ''; wasQuoted = false; i++; continue; }
    if (ch === '\r' || ch === '\n') {
      row.push({ t: field, q: wasQuoted }); rows.push(row); row = []; field = ''; wasQuoted = false;
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++; continue;
    }
    field += ch; i++;
  }
  if (field !== '' || row.length || wasQuoted) { row.push({ t: field, q: wasQuoted }); rows.push(row); }
  return rows;
}

const NUM_RE = /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?([eE][-+]?\d+)?$/;

function inferCell(text, quoted) {
  if (text === '') return null;
  const t = text.trim();
  // Quoted fields still get number/date detection (as in Excel), but are never treated as formulas.
  if (!quoted && t.length > 1 && t[0] === '=') return { f: t.slice(1), v: null };
  if (quoted && /^\s|\s$/.test(text)) return { v: text };
  if (/^(true|false)$/i.test(t)) return { v: t.toUpperCase() === 'TRUE' };
  if (NUM_RE.test(t) && /\d/.test(t)) {
    const n = Number(t.replace(/,/g, ''));
    if (isFinite(n)) {
      if (/^0\d/.test(t.replace(/^[-+]/, ''))) return { v: text }; // keep leading zeros (IDs, zip codes)
      return t.includes(',') ? { v: n, s: { nf: '#,##0' + (t.includes('.') ? '.00' : '') } } : { v: n };
    }
  }
  let m = /^([-+]?\d+(\.\d+)?)%$/.exec(t);
  if (m) return { v: Number(m[1]) / 100, s: { nf: m[2] ? '0.00%' : '0%' } };
  m = /^\$([-+]?[\d,]+(\.\d+)?)$/.exec(t);
  if (m) return { v: Number(m[1].replace(/,/g, '')), s: { nf: '"$"#,##0.00' } };
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);
  if (m) {
    const d = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
    if (!isNaN(d)) return { v: M.dateToSerial(new Date(d)), s: { nf: m[4] ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd' } };
  }
  return { v: text };
}

function readDelimited(buf, ext, name) {
  const text = decodeText(buf);
  const delim = ext === 'tsv' ? '\t' : detectDelimiter(text);
  const rows = parseDelimited(text, delim);
  const sh = M.emptySheet(name.slice(0, 31) || 'Sheet1');
  rows.forEach((row, r) => row.forEach((f, c) => {
    const cell = inferCell(f.t, f.q);
    if (cell) sh.cells[M.key(r, c)] = cell;
  }));
  return { doc: M.normalizeDoc({ sheets: [sh], activeSheet: 0 }), warnings: [] };
}

function displayText(d) {
  if (!d || d.v == null) return '';
  if (typeof d.v === 'boolean') return d.v ? 'TRUE' : 'FALSE';
  if (typeof d.v === 'number' && d.s && d.s.nf) {
    try { return XLSX.SSF.format(d.s.nf, d.v); } catch { return String(d.v); }
  }
  return String(d.v);
}

function writeDelimited(doc, delim, sheetIndex) {
  const sh = doc.sheets[sheetIndex != null ? sheetIndex : doc.activeSheet || 0];
  const b = M.usedBounds(sh);
  if (!b) return Buffer.from('', 'utf8');
  const lines = [];
  for (let r = 0; r <= b.r2; r++) {
    const fields = [];
    for (let c = 0; c <= b.c2; c++) {
      let t = displayText(sh.cells[M.key(r, c)]);
      if (t.includes('"') || t.includes(delim) || /[\r\n]/.test(t) || /^\s|\s$/.test(t)) t = '"' + t.replace(/"/g, '""') + '"';
      fields.push(t);
    }
    while (fields.length > 1 && fields[fields.length - 1] === '') fields.pop();
    lines.push(fields.join(delim));
  }
  return Buffer.from(lines.join('\r\n') + '\r\n', 'utf8');
}

/* -------------------------------------------------------------------- entry */

async function readFile(buf, filePath) {
  const ext = extOf(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  // Content sniffing takes precedence over the extension so mislabelled files still open.
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const isCfb = buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0;
  const isGzip = buf[0] === 0x1f && buf[1] === 0x8b;
  if (ext === 'spst' || isGzip) return { doc: readSpst(buf), warnings: [] };
  if (isZip) {
    const zip = await JSZip.loadAsync(buf);
    if (zip.file('xl/workbook.xml')) return readXlsx(buf, ext === 'xlsm' || zip.file('xl/vbaProject.bin') ? 'xlsm' : 'xlsx');
    return readSheetJs(buf); // ODS or other zip-based formats SheetJS understands
  }
  if (isCfb || ext === 'xls' || ext === 'ods' || ext === 'fods' || ext === 'xlsb') return readSheetJs(buf);
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt' || !ext) return readDelimited(buf, ext, base);
  return readSheetJs(buf);
}

async function writeFile(doc, filePath) {
  const ext = extOf(filePath);
  switch (ext) {
    case 'spst': return writeSpst(doc);
    case 'xlsx': return writeXlsx(doc, 'xlsx');
    case 'xlsm': return writeXlsx(doc, 'xlsm');
    case 'xls': return writeSheetJs(doc, 'biff8');
    case 'ods': return writeSheetJs(doc, 'ods');
    case 'csv': return writeDelimited(doc, ',');
    case 'tsv': return writeDelimited(doc, '\t');
    default: throw new Error(`Unsupported file type ".${ext}". Use .spst, .xlsx, .xlsm, .xls, .ods, .csv or .tsv.`);
  }
}

/** Human-readable list of what a save to this format will drop, given the document's contents. */
function lossWarnings(doc, filePath) {
  const ext = extOf(filePath);
  const out = [];
  const hasCharts = doc.sheets.some((s) => s.charts && s.charts.length);
  const hasStyles = doc.sheets.some((s) => Object.values(s.cells).some((c) => c && c.s && Object.keys(c.s).some((k) => k !== 'nf')));
  const hasFormulas = doc.sheets.some((s) => Object.values(s.cells).some((c) => c && c.f));
  if (ext !== 'spst' && hasCharts) out.push('charts');
  if (['xls', 'ods', 'csv', 'tsv'].includes(ext) && hasStyles) out.push('cell styling');
  if (['csv', 'tsv'].includes(ext)) {
    if (doc.sheets.length > 1) out.push('every sheet except the active one');
    if (hasFormulas) out.push('formulas (their current values are saved)');
  }
  if (ext === 'xls' && hasFormulas) out.push('some formulas may be saved as values');
  return out;
}

module.exports = { readFile, writeFile, lossWarnings, FORMATS, extOf, parseDelimited, inferCell };
