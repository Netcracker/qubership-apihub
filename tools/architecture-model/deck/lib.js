/* Shared visual language: warm paper palette, flat shapes, native-only drawing. */
const pptxgen = require('pptxgenjs');

const P = {
  BG: 'FDF9F3', INK: '20222E', SOFT: '6E6759', LINE: 'E4DACB',
  CORAL: 'E8674C', MUSTARD: 'EFAE35', TEAL: '2E9E96', INDIGO: '5B5BD6',
  BLUE: '2F6BE4', NAVYC: '1B3F8F', LEAF: '5AA45A', PLUM: 'B4507E', CLAY: 'C2703D',
  BLUSH: 'FBDDD4', BUTTER: 'FBEBC8', MINT: 'D6EDE6', LILAC: 'E2E0FA',
  SKY: 'DCE7FB', SAND: 'F2E8DA', PAPER: 'FFFFFF',
  H: 'Calibri', A: 'Cambria',
};

function mk(pres, state) {
  const { INK, SOFT, BG, H, A } = P;

  const api = {
    slide(bg) { const s = pres.addSlide(); s.background = { color: bg || BG }; return s; },

    T(s, text, x, y, w, h, o = {}) {
      s.addText(text, Object.assign({ x, y, w, h, fontFace: H, fontSize: 12, color: INK,
        isTextBox: true, margin: 0, valign: 'top' }, o));
    },

    box(s, x, y, w, h, fill, o = {}) {
      const opt = { x, y, w, h, fill: { color: fill },
        line: { color: o.line || fill, width: o.lw || 1 },
        rectRadius: o.r === undefined ? 0.1 : o.r };
      if (o.dash) opt.line = { color: o.line || fill, width: o.lw || 1.25, dashType: 'dash' };
      s.addShape(pres.ShapeType.roundRect, opt);
    },

    circle(s, x, y, d, fill) {
      s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill } });
    },

    bar(s, x, y, w, h, fill) {
      s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.5 });
    },

    /* panel with a caption in the top-left corner */
    panel(s, x, y, w, h, fill, stroke, label, labelColor, dash) {
      api.box(s, x, y, w, h, fill, { line: stroke, lw: 1.25, r: 0.14, dash });
      if (label) api.T(s, label, x + 0.18, y + 0.12, w - 0.36, 0.26,
        { fontSize: 10.5, bold: true, color: labelColor || stroke, charSpacing: 0.6 });
    },

    /* component chip: title + optional subtitle */
    node(s, x, y, w, h, fill, title, sub, o = {}) {
      api.box(s, x, y, w, h, fill, { line: o.line || fill, lw: o.lw || 1, r: o.r === undefined ? 0.1 : o.r, dash: o.dash });
      const tc = o.color || 'FFFFFF';
      if (sub) {
        api.T(s, title, x + 0.12, y + 0.09, w - 0.24, h * 0.45,
          { fontSize: o.fs || 11, bold: true, color: tc, align: o.align || 'left' });
        api.T(s, sub, x + 0.12, y + h * 0.46, w - 0.24, h * 0.5,
          { fontSize: o.fss || 8.5, color: o.subColor || tc, align: o.align || 'left' });
      } else {
        api.T(s, title, x + 0.1, y, w - 0.2, h,
          { fontSize: o.fs || 11, bold: true, color: tc, align: o.align || 'center', valign: 'middle' });
      }
    },

    /* small pill */
    pill(s, x, y, w, h, fill, text, color, fs) {
      api.box(s, x, y, w, h, fill, { line: fill, r: 0.3 });
      api.T(s, text, x + 0.06, y, w - 0.12, h, { fontSize: fs || 9, bold: true, color: color || 'FFFFFF', align: 'center', valign: 'middle' });
    },

    vArrow(s, cx, y0, y1, color, label) {
      const head = 0.15;
      api.bar(s, cx - 0.025, y0, 0.05, Math.max(y1 - y0 - head, 0.02), color);
      s.addShape(pres.ShapeType.triangle, { x: cx - 0.1, y: y1 - head, w: 0.2, h: head,
        fill: { color }, line: { color }, rotate: 180 });
      if (label) api.T(s, label, cx + 0.12, y0 + (y1 - y0) / 2 - 0.11, 2.4, 0.22, { fontSize: 8.5, color: P.SOFT });
    },

    hArrow(s, x0, x1, cy, color, label) {
      const head = 0.15;
      api.bar(s, x0, cy - 0.025, Math.max(x1 - x0 - head, 0.02), 0.05, color);
      s.addShape(pres.ShapeType.triangle, { x: x1 - head, y: cy - 0.1, w: head, h: 0.2,
        fill: { color }, line: { color }, rotate: 90 });
      if (label) api.T(s, label, x0, cy - 0.34, x1 - x0, 0.24, { fontSize: 8.5, color: P.SOFT, align: 'center' });
    },

    /* elbow link used by the swim-lane flows: right edge of A -> left edge of B */
    link(s, x0, y0, x1, y1, color) {
      const midx = x0 + (x1 - x0) / 2;
      if (Math.abs(y0 - y1) < 0.02) { api.hArrow(s, x0, x1, y0, color); return; }
      api.bar(s, x0, y0 - 0.025, midx - x0, 0.05, color);
      api.bar(s, midx - 0.025, Math.min(y0, y1), 0.05, Math.abs(y1 - y0), color);
      api.hArrow(s, midx, x1, y1, color);
    },

    head(s, kicker, title, sub, color) {
      if (kicker) api.T(s, kicker.toUpperCase(), 0.55, 0.5, 11.9, 0.28,
        { fontSize: 10.5, bold: true, color: color || P.CORAL, charSpacing: 2 });
      api.T(s, title, 0.55, 0.84, 11.9, 0.72, { fontSize: 30, bold: true, color: INK });
      if (sub) api.T(s, sub, 0.55, 1.62, 12.0, 0.4, { fontSize: 12.5, color: SOFT });
    },

    foot(s, dark) {
      state.n++;
      api.T(s, 'Qubership APIHUB · architecture and capability map · September 2026', 0.55, 6.98, 8, 0.28,
        { fontSize: 8.5, color: dark ? 'A9A296' : SOFT });
      api.T(s, String(state.n), 12.2, 6.98, 0.5, 0.28,
        { fontSize: 8.5, color: dark ? 'A9A296' : SOFT, align: 'right' });
    },

    section(num, title, sub, color, tint) {
      const s = api.slide(color);
      api.circle(s, 10.3, 0.9, 2.4, tint);
      api.circle(s, 11.9, 4.2, 1.5, tint);
      s.addShape(pres.ShapeType.star4, { x: 9.7, y: 5.0, w: 0.65, h: 0.65, fill: { color: tint }, line: { color: tint } });
      api.T(s, num, 1.0, 1.9, 3, 1.3, { fontFace: A, fontSize: 68, bold: true, color: tint });
      api.T(s, title, 1.0, 3.2, 8.4, 1.0, { fontSize: 42, bold: true, color: 'FFFFFF' });
      api.T(s, sub, 1.0, 4.35, 7.8, 0.9, { fontSize: 15, color: 'F3E9DC' });
      api.foot(s, true);
      return s;
    },

    legend(s, x, y, items, fs) {
      items.forEach(([c, t], i) => {
        const cx = x + i * (12.2 / items.length);
        api.box(s, cx, y, 0.22, 0.2, c, { r: 0.04 });
        api.T(s, t, cx + 0.3, y - 0.03, (12.2 / items.length) - 0.42, 0.28,
          { fontSize: fs || 9, color: P.SOFT, valign: 'middle' });
      });
    },
  };
  return api;
}

module.exports = { P, mk, pptxgen };
