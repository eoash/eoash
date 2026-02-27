// ============================================================
// EO Town Hall - Finance Slides Generator v2
// \uc7ac\ubb34 \ud604\ud669 2026.02 (\ud604\uae08/\ub9e4\ucd9c/\ubaa9\ud45c\ub2ec\uc131\ub960 3\uc7a5)
// \ub9c8\uc9c0\ub9c9 \uc5c5\ub370\uc774\ud2b8: 2026-02-27 (v2 \u2014 \uac00\ub3c5\uc131 \uac1c\uc120)
// ============================================================

var DECK_ID = "1LSW7jCnaxExn3sgp84gVRQdLCjBEUzJUNAPtb1RWabM";

var C = {
  BLACK:     "#0D0D0D",
  WHITE:     "#FFFFFF",
  GRAY_DARK: "#1A1A1A",
  GRAY_MID:  "#2A2A2A",
  GRAY_LINE: "#333333",
  ACCENT:    "#E8FF47",
  MUTED:     "#999999",
  DIMMED:    "#555555",
  GREEN:     "#4CAF50",
  RED:       "#FF5252"
};

// ──────────────────────────────────────────────────────────
// \uacf5\ud1b5 \uc720\ud2f8 \ud568\uc218
// ──────────────────────────────────────────────────────────

function addText(slide, text, x, y, w, h, opts) {
  var box = slide.insertTextBox(text, x, y, w, h);
  var style = box.getText().getTextStyle();
  style.setFontFamily("Arial");
  style.setFontSize(opts.size || 10);
  style.setBold(opts.bold || false);
  style.setForegroundColor(opts.color || C.WHITE);
  box.getFill().setTransparent();
  return box;
}

function addRect(slide, x, y, w, h, color, opacity) {
  var shape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  if (opacity !== undefined) {
    shape.getFill().setSolidFill(color, opacity);
  } else {
    shape.getFill().setSolidFill(color);
  }
  shape.getBorder().setTransparent();
  return shape;
}

function addLine(slide, x, y, length, color) {
  var line = slide.insertLine(
    SlidesApp.LineCategory.STRAIGHT,
    x, y, x + length, y
  );
  line.getLineFill().setSolidFill(color);
  return line;
}

// ──────────────────────────────────────────────────────────
// \uacf5\ud1b5 \uc2ac\ub77c\uc774\ub4dc \ud5e4\ub354
// ──────────────────────────────────────────────────────────

function addSlideHeader(slide, label, W) {
  var PAD = 32;
  addRect(slide, 0, 0, W, 405, C.BLACK);
  // ACCENT \uc138\ub85c \ub9c8\ucee4
  addRect(slide, PAD, 12, 3, 20, C.ACCENT);
  // \uc139\uc158 \ub808\uc774\ube14
  addText(slide, label, PAD + 10, 12, 280, 20,
    {size: 11, bold: true, color: C.ACCENT});
  // \ub0a0\uc9dc (\uc6b0\uce21)
  addText(slide, "FINANCE  \u00B7  2026.02", W - PAD - 160, 12, 160, 20,
    {size: 10, color: C.DIMMED});
  // \uad6c\ubd84\uc120
  addLine(slide, PAD, 40, W - PAD * 2, C.GRAY_LINE);
}

// ──────────────────────────────────────────────────────────
// SLIDE 1: \ud604\uae08 \ud604\ud669 (Cash Position)
// ──────────────────────────────────────────────────────────

function buildSlide1(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;
  var PAD = 32;

  addSlideHeader(slide, "CASH POSITION", W);

  // KPI \ud5e4\ub4dc\ub77c\uc778: 54pt
  addText(slide, "\u20A9209,384,380", PAD, 50, 460, 64,
    {size: 54, bold: true, color: C.WHITE});

  // \uc11c\ube0c \uc815\ubcf4
  addText(slide, "2.09\uC5B5 \uC6D0", PAD, 116, 140, 18,
    {size: 13, color: C.MUTED});
  addText(slide,
    "3\uAC1C \uBC95\uC778 2\uC6D4 \uB9D0 \uD604\uAE08  \u00B7  \uC804\uC6D4 \uB300\uBE44  \u25BC154,010,405",
    190, 116, 498, 18,
    {size: 13, color: C.MUTED});

  addLine(slide, PAD, 140, W - PAD * 2, C.GRAY_LINE);

  // ── \uc88c\uce21 \ube14\ub85d: By Entity ──
  var BY = 152;
  var BH = 196;
  addRect(slide, PAD, BY, 308, BH, C.GRAY_DARK);

  addText(slide, "By Entity", PAD + 14, BY + 12, 260, 18,
    {size: 13, bold: true, color: C.ACCENT});
  addLine(slide, PAD + 14, BY + 34, 280, C.GRAY_LINE);

  addText(slide, "Korea", PAD + 14, BY + 44, 120, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "\u20A994,596,329", PAD + 14, BY + 62, 270, 16,
    {size: 13, color: C.MUTED});

  addText(slide, "United States", PAD + 14, BY + 86, 140, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "$70,599  \u2248  \u20A9103,075,752", PAD + 14, BY + 104, 270, 16,
    {size: 13, color: C.MUTED});

  addText(slide, "Vietnam", PAD + 14, BY + 128, 120, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "\u20A911,712,299", PAD + 14, BY + 146, 270, 16,
    {size: 13, color: C.MUTED});

  // ── \uc6b0\uce21 \ube14\ub85d: Net Change ──
  addRect(slide, 352, BY, 336, BH, C.GRAY_DARK);

  addText(slide, "Net Change (Jan \u2192 Feb)", 366, BY + 12, 306, 18,
    {size: 13, bold: true, color: C.ACCENT});
  addLine(slide, 366, BY + 34, 308, C.GRAY_LINE);

  addText(slide, "Korea", 366, BY + 44, 120, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "\u25BC 47,157,104", 490, BY + 44, 154, 16,
    {size: 13, color: C.RED});

  addText(slide, "United States", 366, BY + 72, 140, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "\u25BC 93,744,162", 490, BY + 72, 154, 16,
    {size: 13, color: C.RED});

  addText(slide, "Vietnam", 366, BY + 100, 120, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "\u25BC 13,109,139", 490, BY + 100, 154, 16,
    {size: 13, color: C.RED});

  addLine(slide, 366, BY + 128, 308, C.GRAY_LINE);
  addText(slide, "Total", 366, BY + 136, 100, 18,
    {size: 13, bold: true, color: C.WHITE});
  addText(slide, "\u25BC 154,010,405", 490, BY + 136, 154, 18,
    {size: 15, bold: true, color: C.RED});

  // ── \ud558\ub2e8 Footer ──
  addRect(slide, PAD, 356, W - PAD * 2, 28, C.GRAY_MID);
  addText(slide,
    "\u2192  3\uC6D4 GL\ucf58\ud150\uce20 5.49\uC5B5 \uC785\uAE08 \uC608\uC815  \u00B7  \uD604\uAE08 \uD68C\uBCF5 \uC804\uB9DD",
    PAD + 12, 363, 640, 16,
    {size: 10, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// SLIDE 2: \ub9e4\ucd9c \uc2e4\uc801 & YoY \ube44\uad50
// ──────────────────────────────────────────────────────────

function buildSlide2(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;
  var PAD = 32;

  addSlideHeader(slide, "REVENUE", W);

  // KPI \ud5e4\ub4dc\ub77c\uc778
  addText(slide, "\u20A9432,176,391", PAD, 50, 460, 64,
    {size: 54, bold: true, color: C.WHITE});

  addText(slide, "1-2\uC6D4 \uB204\uC801 \uB9E4\uCD9C", PAD, 116, 160, 18,
    {size: 13, color: C.MUTED});
  addText(slide,
    "GL \uAE00\uB85C\uBC8C 94% \uACAC\uC778  \u00B7  \uB3D9\uC77C BU \uAE30\uC900 YoY -8%",
    210, 116, 478, 18,
    {size: 13, color: C.MUTED});

  addLine(slide, PAD, 140, W - PAD * 2, C.GRAY_LINE);

  // ── \uc88c\uce21 \ube14\ub85d: Monthly Revenue ──
  var BY = 152;
  var BH = 196;
  addRect(slide, PAD, BY, 308, BH, C.GRAY_DARK);

  addText(slide, "Monthly Revenue", PAD + 14, BY + 12, 260, 18,
    {size: 13, bold: true, color: C.ACCENT});
  addLine(slide, PAD + 14, BY + 34, 280, C.GRAY_LINE);

  // \ud5e4\ub354 \ud589
  addText(slide, "BU", PAD + 14, BY + 42, 80, 14,
    {size: 10, color: C.DIMMED});
  addText(slide, "1\uC6D4", PAD + 134, BY + 42, 70, 14,
    {size: 10, color: C.DIMMED});
  addText(slide, "2\uC6D4", PAD + 214, BY + 42, 70, 14,
    {size: 10, color: C.DIMMED});

  // KR \ud55c\uad6d
  addText(slide, "KR \uD55C\uAD6D", PAD + 14, BY + 62, 110, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "1.6M", PAD + 134, BY + 62, 70, 16,
    {size: 12, color: C.MUTED});
  addText(slide, "13.1M", PAD + 214, BY + 62, 70, 16,
    {size: 12, color: C.WHITE});

  // \ud50c\ub798\ub2db
  addText(slide, "\uD50C\uB798\uB2DB", PAD + 14, BY + 84, 110, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "6.5M", PAD + 134, BY + 84, 70, 16,
    {size: 12, color: C.MUTED});
  addText(slide, "5.0M", PAD + 214, BY + 84, 70, 16,
    {size: 12, color: C.WHITE});

  // GL \uae00\ub85c\ubc8c
  addText(slide, "GL \uAE00\uB85C\uBC8C", PAD + 14, BY + 106, 110, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "320.7M", PAD + 134, BY + 106, 70, 16,
    {size: 12, color: C.MUTED});
  addText(slide, "85.2M", PAD + 214, BY + 106, 70, 16,
    {size: 12, color: C.WHITE});

  // \ud569\uacc4
  addLine(slide, PAD + 14, BY + 130, 280, C.GRAY_LINE);
  addText(slide, "\uD569\uACC4", PAD + 14, BY + 138, 110, 16,
    {size: 12, bold: true, color: C.WHITE});
  addText(slide, "328.9M", PAD + 134, BY + 138, 70, 16,
    {size: 12, bold: true, color: C.WHITE});
  addText(slide, "103.3M", PAD + 214, BY + 138, 70, 16,
    {size: 12, bold: true, color: C.WHITE});

  // ── \uc6b0\uce21 \ube14\ub85d: YoY ──
  addRect(slide, 352, BY, 336, BH, C.GRAY_DARK);

  addText(slide, "YoY (2025 vs 2026 \uB3D9\uC77CBU)", 366, BY + 12, 306, 18,
    {size: 13, bold: true, color: C.ACCENT});
  addLine(slide, 366, BY + 34, 308, C.GRAY_LINE);

  addText(slide, "GL \uAE00\uB85C\uBC8C", 366, BY + 50, 210, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "+27%", 590, BY + 50, 70, 16,
    {size: 14, bold: true, color: C.GREEN});

  addText(slide, "KR \uD55C\uAD6D", 366, BY + 80, 210, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "-77%", 590, BY + 80, 70, 16,
    {size: 14, bold: true, color: C.RED});

  addText(slide, "\uD50C\uB798\uB2DB \uD55C\uAD6D", 366, BY + 110, 210, 16,
    {size: 12, color: C.WHITE});
  addText(slide, "-87%", 590, BY + 110, 70, 16,
    {size: 14, bold: true, color: C.RED});

  addLine(slide, 366, BY + 138, 308, C.GRAY_LINE);
  addText(slide, "\uC804\uCCB4 (\uB3D9\uC77CBU)", 366, BY + 146, 200, 18,
    {size: 12, bold: true, color: C.WHITE});
  addText(slide, "-8%", 590, BY + 146, 70, 18,
    {size: 15, bold: true, color: C.RED});

  // ── \ud558\ub2e8 Footer ──
  addRect(slide, PAD, 356, W - PAD * 2, 28, C.GRAY_MID);
  addText(slide,
    "\u2192  \uD30C\uC774\uD504\uB77C\uC778: 3\uC6D4 5.49\uC5B5 (GL\ucf58\ud150\uce20) + 5\uC6D4 11.4\uC5B5 (\uD504\uB85C\uB355\uC158+\uD50C\uB798\uB2DB\uAD50\uC721) \uD655\uC815",
    PAD + 12, 363, 640, 16,
    {size: 10, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// SLIDE 3: \uc0ac\uc5c5\ubd80\ubcc4 \ubaa9\ud45c \ub2ec\uc131\ub960
// ──────────────────────────────────────────────────────────

function buildSlide3(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;
  var PAD = 32;

  addSlideHeader(slide, "BU GOALS", W);

  // KPI
  addText(slide, "17.8%", PAD, 50, 380, 64,
    {size: 54, bold: true, color: C.WHITE});

  addText(slide, "\uC804\uC0AC \uC5F0\uAC04 \uBAA9\uD45C \uB2EC\uC131\uB960 (\uD655\uC815 \uB525 \uAE30\uC900)", PAD, 116, 430, 18,
    {size: 13, color: C.MUTED});
  addText(slide,
    "\uC5F0\uAC04 \uBAA9\uD45C 120\uC5B5  \u00B7  \uD655\uC815 21.4\uC5B5  \u00B7  \uC794\uC5EC 98.6\uC5B5",
    490, 116, 198, 18,
    {size: 13, color: C.MUTED});

  addLine(slide, PAD, 140, W - PAD * 2, C.GRAY_LINE);

  // ── \uce74\ub4dc 3\uac1c ──
  var CW   = 210;
  var CH   = 196;
  var CY   = 150;
  var CGAP = 12;
  var BARW = 182;
  var BARH = 10;
  var BARY = CY + 144;

  var x1 = PAD;
  var x2 = x1 + CW + CGAP;
  var x3 = x2 + CW + CGAP;

  addRect(slide, x1, CY, CW, CH, C.GRAY_DARK);
  addRect(slide, x2, CY, CW, CH, C.GRAY_DARK);
  addRect(slide, x3, CY, CW, CH, C.GRAY_DARK);

  var cards = [
    {x: x1, title: "KR \uD55C\uAD6D",          goal: "13\uC5B5", deal: "3.3\uC5B5", pct: 0.254, pctStr: "25.4%", gap: "-9.7\uC5B5"},
    {x: x2, title: "\uD50C\uB798\uB2DB \uD55C\uAD6D", goal: "22\uC5B5", deal: "8.5\uC5B5", pct: 0.388, pctStr: "38.8%", gap: "-13.5\uC5B5"},
    {x: x3, title: "GL \uAE00\uB85C\uBC8C",     goal: "85\uC5B5", deal: "9.6\uC5B5", pct: 0.112, pctStr: "11.2%", gap: "-75.4\uC5B5"}
  ];

  for (var i = 0; i < cards.length; i++) {
    var c  = cards[i];
    var cx = c.x;

    // \uce74\ub4dc \uc81c\ubaa9
    addText(slide, c.title, cx + 14, CY + 12, CW - 28, 18,
      {size: 13, bold: true, color: C.ACCENT});
    addLine(slide, cx + 14, CY + 34, CW - 28, C.GRAY_LINE);

    // \ubaa9\ud45c
    addText(slide, "\uBAA9\uD45C", cx + 14, CY + 44, 60, 14,
      {size: 10, color: C.DIMMED});
    addText(slide, c.goal, cx + 14, CY + 58, CW - 28, 26,
      {size: 20, bold: true, color: C.WHITE});

    // \ud655\uc815 \ub525
    addText(slide, "\uD655\uC815 \uB525", cx + 14, CY + 90, 60, 14,
      {size: 10, color: C.DIMMED});
    addText(slide, c.deal, cx + 14, CY + 104, CW - 28, 22,
      {size: 16, color: C.WHITE});

    // \ub2ec\uc131\ub960 \ubc14
    addRect(slide, cx + 14, BARY, BARW, BARH, C.GRAY_MID);
    addRect(slide, cx + 14, BARY, Math.round(BARW * c.pct), BARH, C.ACCENT);

    // \ub2ec\uc131\ub960 %
    addText(slide, c.pctStr, cx + 14, BARY + 14, 100, 20,
      {size: 14, bold: true, color: C.ACCENT});

    // \ubaa9\ud45c\ub300\ube44
    addText(slide, "\ubaa9\ud45c\ub300\ube44 " + c.gap, cx + 14, BARY + 38, CW - 28, 14,
      {size: 10, color: C.DIMMED});
  }

  // ── \ud558\ub2e8 Footer ──
  addText(slide,
    "\u2192  \uD50C\uB798\uB2DB\uC774 \uB2EC\uC131\uB960 1\uC704(38.8%)  \u00B7  GL\uC740 \uC808\uB300 \uAE08\uC561 \uCD5C\uB300(9.6\uC5B5)  \u00B7  \uC804\uCCB4 98.6\uC5B5 \uCD94\uAC00 \uC218\uC8FC \uD544\uC694",
    PAD, 358, W - PAD * 2, 16,
    {size: 10, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// \uba54\uc778 \ud568\uc218
// ──────────────────────────────────────────────────────────

function addSlides() {
  var presentation = SlidesApp.openById(DECK_ID);
  var slides = presentation.getSlides();
  var totalSlides = slides.length;

  Logger.log("\ud604\uc7ac \uc2ac\ub77c\uc774\ub4dc \uc218: " + totalSlides);

  // \ub9c8\uc9c0\ub9c9 3\uac1c \uc2ac\ub77c\uc774\ub4dc \uc0ad\uc81c (\uc774\uc804\uc5d0 \ucd94\uac00\ud55c \uc2ac\ub77c\uc774\ub4dc \uad50\uccb4)
  if (totalSlides >= 3) {
    for (var i = 0; i < 3; i++) {
      var allSlides = presentation.getSlides();
      allSlides[allSlides.length - 1].remove();
    }
    Logger.log("\uae30\uc874 \ub9c8\uc9c0\ub9c9 3\uc7a5 \uc0ad\uc81c \uc644\ub8cc");
  }

  buildSlide1(presentation);
  Logger.log("SLIDE 1 \ucd94\uac00: \ud604\uae08 \ud604\ud669 (Cash Position)");

  buildSlide2(presentation);
  Logger.log("SLIDE 2 \ucd94\uac00: \ub9e4\ucd9c \uc2e4\uc801 & YoY \ube44\uad50");

  buildSlide3(presentation);
  Logger.log("SLIDE 3 \ucd94\uac00: \uc0ac\uc5c5\ubd80\ubcc4 \ubaa9\ud45c \ub2ec\uc131\ub960");

  Logger.log("==============================");
  Logger.log("\uc644\ub8cc: \uc2ac\ub77c\uc774\ub4dc 3\uc7a5 \uc628\ub85c\ub4dc");
  Logger.log("URL: https://docs.google.com/presentation/d/" + DECK_ID + "/edit");
  Logger.log("==============================");
}
