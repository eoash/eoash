// ============================================================
// EO Town Hall — Finance Slides Generator
// 재무 현황 2026.02 (현금/매출/목표달성률 3장)
// 마지막 업데이트: 2026-02-27
// ============================================================

var DECK_ID = "1LSW7jCnaxExn3sgp84gVRQdLCjBEUzJUNAPtb1RWabM";

var C = {
  BLACK:     "#0D0D0D",
  WHITE:     "#FFFFFF",
  GRAY_DARK: "#1E1E1E",
  GRAY_MID:  "#2E2E2E",
  ACCENT:    "#E8FF47",
  MUTED:     "#888888",
  DIMMED:    "#555555",
  GREEN:     "#4CAF50",
  RED:       "#FF5252"
};

// ──────────────────────────────────────────────────────────
// 공통 유틸 함수
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
// 공통 슬라이드 헤더
// ──────────────────────────────────────────────────────────

function addSlideHeader(slide, section, W) {
  var today = "2026.02";
  // 배경: 완전 블랙
  addRect(slide, 0, 0, W, 405, C.BLACK);
  // 좌상단: 섹션명
  addText(slide, "FINANCE \u00B7 " + today, 28, 18, 250, 16,
    {size: 8, color: C.DIMMED});
  // 우상단: 날짜
  addText(slide, today, W - 128, 18, 100, 16,
    {size: 8, color: C.DIMMED, align: "right"});
  // 구분선
  addLine(slide, 28, 38, W - 56, C.GRAY_MID);
}

// ──────────────────────────────────────────────────────────
// SLIDE 1: 현금 현황 (Cash Position)
// ──────────────────────────────────────────────────────────

function buildSlide1(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;

  addSlideHeader(slide, "CASH POSITION", W);

  // L1 헤드라인 수치: 38pt, Bold, WHITE
  addText(slide, "\u20A9209,384,380", 28, 52, 420, 46,
    {size: 38, bold: true, color: C.WHITE});

  // L2 서브 요약 (억 단위) — 헤드라인 하단 좌
  addText(slide, "2.09\uC5B5 \uC6D0", 28, 97, 160, 16,
    {size: 13, color: C.MUTED});

  // L2 서브타이틀 — 우측
  addText(slide,
    "3\uAC1C \uBC95\uC778 2\uC6D4 \uB9D0 \uD604\uAE08 \uC794\uACE0  |  \uC804\uC6D4 \uB300\uBE44  \u25BC154,010,405",
    200, 97, 492, 16,
    {size: 13, color: C.MUTED});

  // 구분선
  addLine(slide, 28, 118, W - 56, C.GRAY_MID);

  // ── 좌측 블록: By Entity ──
  addRect(slide, 28, 128, 310, 185, C.GRAY_DARK);

  // L3 블록 제목: 10pt, Bold, ACCENT
  addText(slide, "By Entity", 44, 140, 200, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, 44, 157, 278, C.GRAY_MID);

  // Korea — L4: 9pt, WHITE
  addText(slide, "Korea", 44, 163, 140, 13,
    {size: 9, color: C.WHITE});
  // L4 수치: 9pt, MUTED (서브 정보)
  addText(slide, "\u20A994,596,329", 44, 176, 280, 13,
    {size: 9, color: C.MUTED});

  // United States
  addText(slide, "United States", 44, 196, 140, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "$70,599  \u2248  \u20A9103,075,752", 44, 209, 280, 13,
    {size: 9, color: C.MUTED});

  // Vietnam
  addText(slide, "Vietnam", 44, 229, 140, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "\u20A911,712,299", 44, 242, 280, 13,
    {size: 9, color: C.MUTED});

  // ── 우측 블록: Net Change ──
  addRect(slide, 352, 128, 340, 185, C.GRAY_DARK);

  // L3 블록 제목
  addText(slide, "Net Change (Jan \u2192 Feb)", 368, 140, 300, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, 368, 157, 308, C.GRAY_MID);

  // Korea — L4
  addText(slide, "Korea", 368, 163, 140, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "\u25BC 47,157,104", 368, 176, 200, 13,
    {size: 9, color: C.RED});

  // United States
  addText(slide, "United States", 368, 196, 140, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "\u25BC 93,744,162", 368, 209, 200, 13,
    {size: 9, color: C.RED});

  // Vietnam
  addText(slide, "Vietnam", 368, 229, 140, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "\u25BC 13,109,139", 368, 242, 200, 13,
    {size: 9, color: C.RED});

  // Total — 구분선 + 합계
  addLine(slide, 368, 262, 308, C.GRAY_MID);
  addText(slide, "Total", 368, 268, 140, 13,
    {size: 9, bold: true, color: C.WHITE});
  addText(slide, "\u25BC 154,010,405", 368, 281, 200, 14,
    {size: 10, bold: true, color: C.RED});

  // ── 하단 메시지 바 ──
  addRect(slide, 28, 320, 664, 28, C.GRAY_MID);
  // L5 캡션: 8pt, DIMMED
  addText(slide,
    "\u2192  3\uC6D4 GL \ucf58\ud150\uce20 5.49\uC5B5 \uC785\uAE08 \uC608\uC815  \u00B7  \uD604\uAE08 \uD68C\uBCF5 \uC804\uB9DD",
    40, 328, 640, 14,
    {size: 8, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// SLIDE 2: 매출 실적 & YoY 비교
// ──────────────────────────────────────────────────────────

function buildSlide2(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;

  addSlideHeader(slide, "REVENUE", W);

  // L1 헤드라인: 38pt, Bold, WHITE
  addText(slide, "\u20A9432,176,391", 28, 52, 420, 46,
    {size: 38, bold: true, color: C.WHITE});

  // L2 요약
  addText(slide, "1-2\uC6D4 \uB204\uC801 \uB9E4\uCD9C", 28, 97, 200, 16,
    {size: 13, color: C.MUTED});

  // L2 서브타이틀
  addText(slide,
    "GL \uAE00\uB85C\uBC8C 94% \uACAC\uC778  |  \uB3D9\uC77C BU \uAE30\uC900 YoY -8%",
    240, 97, 452, 16,
    {size: 13, color: C.MUTED});

  // 구분선
  addLine(slide, 28, 118, W - 56, C.GRAY_MID);

  // ── 좌측 블록: Monthly Revenue ──
  addRect(slide, 28, 128, 310, 185, C.GRAY_DARK);

  // L3 블록 제목
  addText(slide, "Monthly Revenue", 44, 140, 260, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, 44, 157, 278, C.GRAY_MID);

  // 헤더 행 — L5 캡션 수준
  addText(slide, "BU", 44, 163, 90, 13,
    {size: 9, color: C.DIMMED});
  addText(slide, "1\uC6D4", 152, 163, 70, 13,
    {size: 9, color: C.DIMMED, align: "right"});
  addText(slide, "2\uC6D4", 230, 163, 74, 13,
    {size: 9, color: C.DIMMED, align: "right"});

  // KR 한국 — L4
  addText(slide, "KR \uD55C\uAD6D", 44, 178, 100, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "1.6M", 152, 178, 70, 13,
    {size: 9, color: C.MUTED, align: "right"});
  addText(slide, "13.1M", 230, 178, 74, 13,
    {size: 9, color: C.WHITE, align: "right"});

  // 플래닛
  addText(slide, "\uD50C\uB798\uB2DB", 44, 193, 100, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "6.5M", 152, 193, 70, 13,
    {size: 9, color: C.MUTED, align: "right"});
  addText(slide, "5.0M", 230, 193, 74, 13,
    {size: 9, color: C.WHITE, align: "right"});

  // GL 글로벌
  addText(slide, "GL \uAE00\uB85C\uBC8C", 44, 208, 100, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "320.7M", 152, 208, 70, 13,
    {size: 9, color: C.MUTED, align: "right"});
  addText(slide, "85.2M", 230, 208, 74, 13,
    {size: 9, color: C.WHITE, align: "right"});

  // 합계 구분선 + 행
  addLine(slide, 44, 226, 278, C.GRAY_MID);
  addText(slide, "\uD569\uACC4", 44, 232, 100, 13,
    {size: 9, bold: true, color: C.WHITE});
  addText(slide, "328.9M", 152, 232, 70, 13,
    {size: 9, bold: true, color: C.WHITE, align: "right"});
  addText(slide, "103.3M", 230, 232, 74, 13,
    {size: 9, bold: true, color: C.WHITE, align: "right"});

  // ── 우측 블록: YoY ──
  addRect(slide, 352, 128, 340, 185, C.GRAY_DARK);

  // L3 블록 제목
  addText(slide, "YoY (2025 vs 2026 \uB3D9\uC77CBU)", 368, 140, 300, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, 368, 157, 308, C.GRAY_MID);

  // GL 글로벌 — L4
  addText(slide, "GL \uAE00\uB85C\uBC8C", 368, 163, 200, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "+27%", 560, 163, 80, 13,
    {size: 9, color: C.GREEN, align: "right"});

  // KR 한국
  addText(slide, "KR \uD55C\uAD6D", 368, 183, 200, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "-77%", 560, 183, 80, 13,
    {size: 9, color: C.RED, align: "right"});

  // 플래닛 한국
  addText(slide, "\uD50C\uB798\uB2DB \uD55C\uAD6D", 368, 203, 200, 13,
    {size: 9, color: C.WHITE});
  addText(slide, "-87%", 560, 203, 80, 13,
    {size: 9, color: C.RED, align: "right"});

  // 전체 (동일BU)
  addLine(slide, 368, 222, 308, C.GRAY_MID);
  addText(slide, "\uC804\uCCB4 (\uB3D9\uC77CBU)", 368, 229, 200, 13,
    {size: 9, bold: true, color: C.WHITE});
  addText(slide, "-8%", 560, 229, 80, 13,
    {size: 9, bold: true, color: C.RED, align: "right"});

  // ── 하단 메시지 바 ──
  addRect(slide, 28, 320, 664, 28, C.GRAY_MID);
  addText(slide,
    "\u2192  \uD30C\uC774\uD504\uB77C\uC778: 3\uC6D4 5.49\uC5B5 (GL\ucf58\ud150\uce20) + 5\uC6D4 11.4\uC5B5 (\uD504\uB85C\uB355\uC158+\uD50C\uB798\uB2DB\uAD50\uC721) \uD655\uC815",
    40, 328, 640, 14,
    {size: 8, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// SLIDE 3: 사업부별 목표 달성률
// ──────────────────────────────────────────────────────────

function buildSlide3(presentation) {
  var slide = presentation.appendSlide();
  slide.getBackground().setSolidFill(C.BLACK);
  var W = 720;

  addSlideHeader(slide, "BU GOALS", W);

  // L1 헤드라인: 38pt, Bold, WHITE
  addText(slide, "17.8%", 28, 52, 400, 46,
    {size: 38, bold: true, color: C.WHITE});

  // L2 요약
  addText(slide, "\uC804\uC0AC \uC5F0\uAC04 \uBAA9\uD45C \uB2EC\uC131\uB960 (\uD655\uC815 \uB525 \uAE30\uC900)", 28, 97, 400, 16,
    {size: 13, color: C.MUTED});

  // L2 서브타이틀
  addText(slide,
    "\uC5F0\uAC04 \uBAA9\uD45C 120\uC5B5  |  \uD655\uC815 21.4\uC5B5  |  \uC794\uC5EC 98.6\uC5B5",
    28, 112, 664, 16,
    {size: 13, color: C.MUTED});

  // 구분선
  addLine(slide, 28, 132, W - 56, C.GRAY_MID);

  // ── 카드 레이아웃 ──
  // (720 - 56 - 24) / 3 = 640/3 = 213.3 → 213pt
  var cardW  = 213;
  var cardH  = 158;
  var cardY  = 144;
  var barBgY = 250;   // 달성률 바 배경 y
  var barH   = 7;
  var barW   = 180;   // 달성률 바 최대 너비

  // ── 카드 1: KR 한국 ──
  var x1 = 28;
  addRect(slide, x1, cardY, cardW, cardH, C.GRAY_DARK);

  // L3 제목: 10pt, Bold, ACCENT
  addText(slide, "KR \uD55C\uAD6D", x1 + 14, cardY + 10, 185, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, x1 + 14, cardY + 27, cardW - 28, C.GRAY_MID);

  // L5 레이블: 8pt, DIMMED
  addText(slide, "\uBAA9\uD45C", x1 + 14, cardY + 33, 80, 12,
    {size: 8, color: C.DIMMED});
  // 수치: 14pt — L1(38pt)보다 작게, Bold, WHITE
  addText(slide, "13\uC5B5", x1 + 14, cardY + 44, 140, 18,
    {size: 14, bold: true, color: C.WHITE});

  addText(slide, "\uD655\uC815 \uB525", x1 + 14, cardY + 66, 80, 12,
    {size: 8, color: C.DIMMED});
  addText(slide, "3.3\uC5B5", x1 + 14, cardY + 77, 140, 14,
    {size: 11, color: C.WHITE});

  // 달성률 바
  addRect(slide, x1 + 14, barBgY, barW, barH, C.GRAY_MID);
  addRect(slide, x1 + 14, barBgY, Math.round(barW * 0.254), barH, C.ACCENT);

  // L3 달성률 수치: 10pt, Bold, ACCENT
  addText(slide, "25.4%", x1 + 14, barBgY + 11, 100, 13,
    {size: 10, bold: true, color: C.ACCENT});
  // L5 캡션: 8pt, DIMMED
  addText(slide, "\uBAA9\uD45C\uB300\uBE44 -9.7\uC5B5", x1 + 14, barBgY + 25, 185, 12,
    {size: 8, color: C.DIMMED});

  // ── 카드 2: 플래닛 한국 ──
  var x2 = x1 + cardW + 12;  // 253
  addRect(slide, x2, cardY, cardW, cardH, C.GRAY_DARK);

  addText(slide, "\uD50C\uB798\uB2DB \uD55C\uAD6D", x2 + 14, cardY + 10, 185, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, x2 + 14, cardY + 27, cardW - 28, C.GRAY_MID);

  addText(slide, "\uBAA9\uD45C", x2 + 14, cardY + 33, 80, 12,
    {size: 8, color: C.DIMMED});
  addText(slide, "22\uC5B5", x2 + 14, cardY + 44, 140, 18,
    {size: 14, bold: true, color: C.WHITE});

  addText(slide, "\uD655\uC815 \uB525", x2 + 14, cardY + 66, 80, 12,
    {size: 8, color: C.DIMMED});
  addText(slide, "8.5\uC5B5", x2 + 14, cardY + 77, 140, 14,
    {size: 11, color: C.WHITE});

  addRect(slide, x2 + 14, barBgY, barW, barH, C.GRAY_MID);
  addRect(slide, x2 + 14, barBgY, Math.round(barW * 0.388), barH, C.ACCENT);

  addText(slide, "38.8%", x2 + 14, barBgY + 11, 100, 13,
    {size: 10, bold: true, color: C.ACCENT});
  addText(slide, "\uBAA9\uD45C\uB300\uBE44 -13.5\uC5B5", x2 + 14, barBgY + 25, 185, 12,
    {size: 8, color: C.DIMMED});

  // ── 카드 3: GL 글로벌 ──
  var x3 = x2 + cardW + 12;  // 478
  addRect(slide, x3, cardY, cardW, cardH, C.GRAY_DARK);

  addText(slide, "GL \uAE00\uB85C\uBC8C", x3 + 14, cardY + 10, 185, 14,
    {size: 10, bold: true, color: C.ACCENT});
  addLine(slide, x3 + 14, cardY + 27, cardW - 28, C.GRAY_MID);

  addText(slide, "\uBAA9\uD45C", x3 + 14, cardY + 33, 80, 12,
    {size: 8, color: C.DIMMED});
  addText(slide, "85\uC5B5", x3 + 14, cardY + 44, 140, 18,
    {size: 14, bold: true, color: C.WHITE});

  addText(slide, "\uD655\uC815 \uB525", x3 + 14, cardY + 66, 80, 12,
    {size: 8, color: C.DIMMED});
  addText(slide, "9.6\uC5B5", x3 + 14, cardY + 77, 140, 14,
    {size: 11, color: C.WHITE});

  // 달성률 바 — 11.2%: 180 * 0.112 = 20.2pt
  addRect(slide, x3 + 14, barBgY, barW, barH, C.GRAY_MID);
  addRect(slide, x3 + 14, barBgY, Math.round(barW * 0.112), barH, C.ACCENT);

  addText(slide, "11.2%", x3 + 14, barBgY + 11, 100, 13,
    {size: 10, bold: true, color: C.ACCENT});
  addText(slide, "\uBAA9\uD45C\uB300\uBE44 -75.4\uC5B5", x3 + 14, barBgY + 25, 185, 12,
    {size: 8, color: C.DIMMED});

  // ── 하단 메시지 ──
  addText(slide,
    "\u2192  \uD50C\uB798\uB2DB\uC774 \uB2EC\uC131\uB960 1\uC704(38.8%)  |  GL\uC740 \uC808\uB300 \uAE08\uC561 \uCD5C\uB300(9.6\uC5B5)  |  \uC804\uCCB4 98.6\uC5B5 \uCD94\uAC00 \uC218\uC8FC \uD544\uC694",
    28, 310, 664, 14,
    {size: 8, color: C.DIMMED});

  return slide;
}

// ──────────────────────────────────────────────────────────
// 메인 함수
// ──────────────────────────────────────────────────────────

function addSlides() {
  var presentation = SlidesApp.openById(DECK_ID);
  var slides = presentation.getSlides();
  var totalSlides = slides.length;

  Logger.log("\uD604\uC7AC \uC2AC\uB77C\uC774\uB4DC \uC218: " + totalSlides);

  // 마지막 3개 슬라이드 삭제 (이전에 추가한 슬라이드 교체)
  if (totalSlides >= 3) {
    for (var i = 0; i < 3; i++) {
      var allSlides = presentation.getSlides();
      allSlides[allSlides.length - 1].remove();
    }
    Logger.log("\uAE30\uC874 \uB9C8\uC9C0\uB9C9 3\uC7A5 \uC0AD\uC81C \uC644\uB8CC");
  }

  // SLIDE 1: 현금 현황
  buildSlide1(presentation);
  Logger.log("SLIDE 1 \uCD94\uAC00: \uD604\uAE08 \uD604\uD669 (Cash Position)");

  // SLIDE 2: 매출 실적 & YoY 비교
  buildSlide2(presentation);
  Logger.log("SLIDE 2 \uCD94\uAC00: \uB9E4\uCD9C \uC2E4\uC801 & YoY \uBE44\uAD50");

  // SLIDE 3: 사업부별 목표 달성률
  buildSlide3(presentation);
  Logger.log("SLIDE 3 \uCD94\uAC00: \uC0AC\uC5C5\uBD80\uBCC4 \uBAA9\uD45C \uB2EC\uC131\uB960");

  Logger.log("==============================");
  Logger.log("\uC644\uB8CC: \uC2AC\uB77C\uC774\uB4DC 3\uC7A5 \uCD94\uAC00\uB428");
  Logger.log("URL: https://docs.google.com/presentation/d/" + DECK_ID + "/edit");
  Logger.log("==============================");
}
