// ============================================================
// EO Studio Townhall Slides — 2025 결산 & 2026 재무 현황
// Deck ID: 1LSW7jCnaxExn3sgp84gVRQdLCjBEUzJUNAPtb1RWabM
// ============================================================

// --- 색상 팔레트 ---
var BLACK      = "#0D0D0D";
var WHITE      = "#FFFFFF";
var GRAY_DARK  = "#1E1E1E";
var GRAY_MID   = "#2E2E2E";
var ACCENT     = "#E8FF47"; // EO 시그니처 옐로우
var TEXT_MUTED = "#888888";
var GREEN      = "#4CAF50";
var ORANGE     = "#FF6B35";
var RED_WARN   = "#FF4444";

// --- 슬라이드 사이즈 ---
var W = 720;
var H = 405;

// ============================================================
// 유틸 함수
// ============================================================

function addText(slide, text, x, y, w, h, opts) {
  var tb = slide.insertTextBox(text, x, y, w, h);
  var style = tb.getText().getTextStyle();
  if (opts.fontSize)   style.setFontSize(opts.fontSize);
  if (opts.color)      style.setForegroundColor(opts.color);
  if (opts.bold)       style.setBold(true);
  if (opts.fontFamily) style.setFontFamily(opts.fontFamily);
  tb.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
  if (opts.align) {
    tb.getText().getParagraphStyle().setParagraphAlignment(
      opts.align === 'center' ? SlidesApp.ParagraphAlignment.CENTER :
      opts.align === 'right'  ? SlidesApp.ParagraphAlignment.END :
                                SlidesApp.ParagraphAlignment.START
    );
  }
  tb.getBorder().setTransparent();
  tb.getFill().setTransparent();
  return tb;
}

function addRect(slide, x, y, w, h, color, opacity) {
  var shape = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
  shape.getFill().setSolidFill(color, opacity || 1);
  shape.getBorder().setTransparent();
  return shape;
}

function addLine(slide, x, y, length, color) {
  var line = slide.insertLine(SlidesApp.LineCategory.STRAIGHT, x, y, x + length, y);
  line.getLineFill().setSolidFill(color);
  return line;
}

// ============================================================
// 공통 헤더 (모든 슬라이드에 동일 적용)
// ============================================================

function addCommonHeader(slide) {
  // 배경
  addRect(slide, 0, 0, W, H, BLACK);

  // 좌상단 레이블
  addText(slide, "FINANCE · FEB 2026", 40, 18, 200, 20, {
    fontSize: 9, color: TEXT_MUTED
  });

  // 우상단 날짜
  addText(slide, "2026.02", W - 120, 18, 80, 20, {
    fontSize: 9, color: TEXT_MUTED, align: 'right'
  });

  // 구분선
  addLine(slide, 40, 46, 640, GRAY_MID);
}

// ============================================================
// 슬라이드 번호 (우하단)
// ============================================================

function addSlideNumber(slide, num) {
  addText(slide, String(num), W - 50, H - 28, 30, 20, {
    fontSize: 9, color: TEXT_MUTED, align: 'right'
  });
}

// ============================================================
// 하단 메시지 바 (ACCENT 배경 + 검정 텍스트)
// ============================================================

function addBottomBar(slide, message) {
  addRect(slide, 0, H - 42, W, 42, ACCENT);
  addText(slide, message, 24, H - 42, W - 48, 42, {
    fontSize: 8.5, color: BLACK, bold: true
  });
}

// ============================================================
// 카드 배경 (좌/우 분할 카드)
// ============================================================

function addCard(slide, x, y, w, h) {
  addRect(slide, x, y, w, h, GRAY_DARK);
}

// ============================================================
// SLIDE 1: 2025 결산 — 우리가 만든 숫자
// ============================================================

function buildSlide1(pres) {
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  // 공통 헤더
  addCommonHeader(slide);

  // 헤드라인 수치
  addText(slide, "42억 5,671만원", 40, 52, W - 80, 44, {
    fontSize: 34, color: ACCENT, bold: true
  });

  // 서브 타이틀
  addText(slide, "2025년 전사 매출 확정 실적 — GL 글로벌이 전체의 43%를 이끌었다",
    40, 96, W - 80, 20, {
    fontSize: 10, color: TEXT_MUTED
  });

  // ── 좌측 카드: 사업부별 기여 ──
  var cardX = 32, cardY = 122, cardW = 308, cardH = 210;
  addCard(slide, cardX, cardY, cardW, cardH);

  addText(slide, "사업부별 기여", cardX + 16, cardY + 12, cardW - 32, 20, {
    fontSize: 10, color: ACCENT, bold: true
  });

  // 구분선 (카드 내)
  addLine(slide, cardX + 16, cardY + 34, cardW - 32, GRAY_MID);

  var leftItems = [
    ["GL 글로벌",    "18억 1,233만원", "(42.6%)"],
    ["플래닛 한국",  "10억 829만원",   "(23.7%)"],
    ["MCN 한국",    "7억 2,417만원",   "(17.0%)"],
    ["KR 한국",     "7억 1,191만원",   "(16.7%)"]
  ];

  leftItems.forEach(function(item, i) {
    var iy = cardY + 42 + i * 40;

    // 사업부명
    addText(slide, item[0], cardX + 16, iy, 100, 18, {
      fontSize: 9, color: TEXT_MUTED
    });

    // 금액
    addText(slide, item[1], cardX + 16, iy + 16, 200, 16, {
      fontSize: 11, color: WHITE, bold: true
    });

    // 비율 배지
    addRect(slide, cardX + cardW - 68, iy + 14, 54, 18, GRAY_MID);
    addText(slide, item[2], cardX + cardW - 68, iy + 14, 54, 18, {
      fontSize: 8, color: ACCENT, align: 'center'
    });
  });

  // ── 우측 카드: 2025 피크 & 저점 ──
  var rCardX = 356, rCardY = 122, rCardW = 332, rCardH = 210;
  addCard(slide, rCardX, rCardY, rCardW, rCardH);

  addText(slide, "2025 피크 & 저점", rCardX + 16, rCardY + 12, rCardW - 32, 20, {
    fontSize: 10, color: ACCENT, bold: true
  });

  addLine(slide, rCardX + 16, rCardY + 34, rCardW - 32, GRAY_MID);

  // 피크/저점 항목 (색상 구분)
  var rightItems = [
    { label: "최고월 12월",        value: "6억 5,366만원", note: "(역대급)",             color: GREEN  },
    { label: "2위 8월",            value: "5억 506만원",   note: "(프로덕션 대형 건)",   color: GREEN  },
    { label: "최저월 5월",         value: "1억 5,665만원", note: "(프로덕션·이벤트 0)",  color: RED_WARN },
    { label: "KR 콘텐츠 전년比",   value: "-6.5억",        note: "→ GL·프로덕션으로 상쇄", color: ORANGE }
  ];

  rightItems.forEach(function(item, i) {
    var iy = rCardY + 42 + i * 40;

    // 컬러 인디케이터 라인
    addRect(slide, rCardX + 14, iy + 2, 3, 30, item.color);

    addText(slide, item.label, rCardX + 24, iy, rCardW - 40, 16, {
      fontSize: 9, color: TEXT_MUTED
    });
    addText(slide, item.value, rCardX + 24, iy + 15, 160, 16, {
      fontSize: 11, color: item.color, bold: true
    });
    addText(slide, item.note, rCardX + 24, iy + 30, rCardW - 40, 14, {
      fontSize: 8, color: TEXT_MUTED
    });
  });

  // 하단 메시지 바
  addBottomBar(slide,
    "2025는 GL 글로벌과 일회성 대형 건이 버텨준 해. 2026은 구조가 달라야 한다."
  );

  // 슬라이드 번호
  addSlideNumber(slide, 1);
}

// ============================================================
// SLIDE 2: 2026 YTD — 지금 우리는 어디에 있나
// ============================================================

function buildSlide2(pres) {
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  addCommonHeader(slide);

  // 헤드라인 수치 (목표 vs 현재)
  addText(slide, "연간 목표 120억", 40, 52, 280, 28, {
    fontSize: 18, color: TEXT_MUTED, bold: true
  });

  addText(slide, "/", 322, 52, 20, 28, {
    fontSize: 18, color: GRAY_MID, align: 'center'
  });

  addText(slide, "현재 4억 3,218만원", 344, 52, 240, 28, {
    fontSize: 18, color: ACCENT, bold: true
  });

  // 달성률 배지
  addRect(slide, 596, 56, 62, 22, ORANGE);
  addText(slide, "3.6% 달성", 596, 56, 62, 22, {
    fontSize: 8.5, color: BLACK, bold: true, align: 'center'
  });

  // 서브 타이틀
  addText(slide,
    "2월 말 기준 YTD — GL 파이프라인 3월 5억 포함 시 총 9.3억 확보",
    40, 82, W - 80, 18, {
    fontSize: 9.5, color: TEXT_MUTED
  });

  // ── 좌측 카드: 2026 YTD Actual ──
  var lX = 32, lY = 108, lW = 308, lH = 222;
  addCard(slide, lX, lY, lW, lH);

  addText(slide, "2026 YTD Actual (1~2월 확정 입금)", lX + 16, lY + 10, lW - 32, 20, {
    fontSize: 9.5, color: GREEN, bold: true
  });

  addLine(slide, lX + 16, lY + 32, lW - 32, GRAY_MID);

  var actualItems = [
    { label: "GL 글로벌",   value: "4억 587만원", note: "전체의 94%", color: ACCENT, highlight: false },
    { label: "KR 한국",     value: "1,476만원",   note: "",           color: WHITE,  highlight: false },
    { label: "플래닛 한국", value: "1,155만원",   note: "",           color: WHITE,  highlight: false },
    { label: "전사 합계",   value: "4억 3,218만원", note: "",         color: ACCENT, highlight: true  }
  ];

  actualItems.forEach(function(item, i) {
    var iy = lY + 40 + i * 44;

    if (item.highlight) {
      addRect(slide, lX + 12, iy - 4, lW - 24, 36, GRAY_MID);
    }

    addText(slide, item.label, lX + 20, iy, 120, 16, {
      fontSize: 9, color: TEXT_MUTED
    });
    addText(slide, item.value, lX + 20, iy + 16, lW - 50, 18, {
      fontSize: item.highlight ? 13 : 11, color: item.color, bold: item.highlight
    });

    if (item.note) {
      addRect(slide, lX + lW - 76, iy + 14, 62, 18, GRAY_MID);
      addText(slide, item.note, lX + lW - 76, iy + 14, 62, 18, {
        fontSize: 8, color: TEXT_MUTED, align: 'center'
      });
    }
  });

  // ── 우측 카드: 3~5월 Projection ──
  var rX = 356, rY = 108, rW = 332, rH = 222;
  addCard(slide, rX, rY, rW, rH);

  // "예정" 점선 느낌으로 — 카드 상단에 점선 강조 바
  addRect(slide, rX, rY, rW, 4, ORANGE, 0.6);

  addText(slide, "3월~5월 Projection", rX + 16, rY + 10, rW - 80, 20, {
    fontSize: 9.5, color: ORANGE, bold: true
  });

  // "예정" 뱃지
  addRect(slide, rX + rW - 56, rY + 10, 44, 18, ORANGE);
  addText(slide, "예정", rX + rW - 56, rY + 10, 44, 18, {
    fontSize: 8, color: BLACK, bold: true, align: 'center'
  });

  addLine(slide, rX + 16, rY + 32, rW - 32, GRAY_MID);

  var projItems = [
    {
      label: "3월 GL 파이프라인",
      value: "4억 9,915만원",
      note:  "TestBox·Altos·LayerZero·Kalshi ($344K)"
    },
    {
      label: "5월 KR 프로덕션",
      value: "3억원",
      note:  "예정"
    },
    {
      label: "5월 플래닛 교육 (B2B/B2G)",
      value: "8억 4,280만원",
      note:  "예정"
    },
    {
      label: "3~5월 소계",
      value: "약 16억 6,195만원",
      note:  "",
      isTotal: true
    }
  ];

  projItems.forEach(function(item, i) {
    var iy = rY + 40 + i * 44;

    if (item.isTotal) {
      addRect(slide, rX + 12, iy - 4, rW - 24, 38, GRAY_MID);
    }

    addText(slide, item.label, rX + 20, iy, rW - 40, 16, {
      fontSize: 9, color: item.isTotal ? TEXT_MUTED : TEXT_MUTED
    });
    addText(slide, item.value, rX + 20, iy + 16, rW - 40, 18, {
      fontSize: item.isTotal ? 12 : 11,
      color: item.isTotal ? ACCENT : WHITE,
      bold: item.isTotal
    });

    if (item.note && !item.isTotal) {
      addText(slide, item.note, rX + 20, iy + 33, rW - 40, 12, {
        fontSize: 7.5, color: TEXT_MUTED
      });
    }
  });

  // 하단 메시지 바
  addBottomBar(slide,
    "1~5월 확정+파이프라인 합산 약 20.9억. 목표 달성을 위해 4~12월 월 평균 11억 이상이 필요하다."
  );

  addSlideNumber(slide, 2);
}

// ============================================================
// SLIDE 3: 사업부별 목표 vs 현실 — 무엇을 집중해야 하나
// ============================================================

function buildSlide3(pres) {
  var slide = pres.appendSlide(SlidesApp.PredefinedLayout.BLANK);

  addCommonHeader(slide);

  // 헤드라인 수치
  addText(slide, "잔여 목표 99억 1천만원", 40, 52, 420, 28, {
    fontSize: 22, color: ACCENT, bold: true
  });

  // 서브 정보
  addText(slide, "4월~12월 9개월", 466, 58, 100, 20, {
    fontSize: 10, color: TEXT_MUTED
  });

  // 서브 타이틀
  addText(slide,
    "2025 월평균 3.5억 → 2026 목표 달성을 위한 필요 월평균 11억 (3.1배)",
    40, 82, W - 80, 18, {
    fontSize: 9.5, color: TEXT_MUTED
  });

  // ── 좌측 카드: 사업부별 달성률 현황 ──
  var lX = 32, lY = 108, lW = 308, lH = 222;
  addCard(slide, lX, lY, lW, lH);

  addText(slide, "사업부별 달성률 현황", lX + 16, lY + 10, lW - 32, 20, {
    fontSize: 9.5, color: ACCENT, bold: true
  });

  addLine(slide, lX + 16, lY + 32, lW - 32, GRAY_MID);

  // 달성률 데이터
  var deptItems = [
    { name: "GL 글로벌",   target: "85억",   ytd: "4억",    rate: "4.8%",  level: "매우 도전적", barColor: RED_WARN, pct: 0.048 },
    { name: "플래닛 한국", target: "22억",   ytd: "0.12억", rate: "0.5%",  level: "5월 대형 건 필수", barColor: ORANGE, pct: 0.005 },
    { name: "KR 한국",     target: "13억",   ytd: "0.15억", rate: "1.1%",  level: "5월 프로덕션 관건", barColor: ORANGE, pct: 0.011 }
  ];

  deptItems.forEach(function(dept, i) {
    var iy = lY + 40 + i * 60;

    // 사업부명
    addText(slide, dept.name, lX + 16, iy, 100, 16, {
      fontSize: 9.5, color: WHITE, bold: true
    });

    // 목표 / YTD
    addText(slide, "목표 " + dept.target + "  /  YTD " + dept.ytd, lX + 16, iy + 16, lW - 48, 14, {
      fontSize: 8.5, color: TEXT_MUTED
    });

    // 진행 바 배경
    var barW = lW - 32;
    addRect(slide, lX + 16, iy + 32, barW, 8, GRAY_MID);

    // 진행 바 (실제 달성)
    var fillW = Math.max(4, Math.round(barW * dept.pct));
    addRect(slide, lX + 16, iy + 32, fillW, 8, dept.barColor);

    // 달성률 + 코멘트
    addText(slide, dept.rate + "  " + dept.level, lX + 16, iy + 42, lW - 32, 14, {
      fontSize: 8, color: dept.barColor
    });
  });

  // ── 우측 카드: Top 3 캐시플로우 리스크 ──
  var rX = 356, rY = 108, rW = 332, rH = 222;
  addCard(slide, rX, rY, rW, rH);

  // 경고 강조 바
  addRect(slide, rX, rY, rW, 4, RED_WARN, 0.7);

  addText(slide, "Top 3 캐시플로우 리스크", rX + 16, rY + 10, rW - 32, 20, {
    fontSize: 9.5, color: RED_WARN, bold: true
  });

  addLine(slide, rX + 16, rY + 32, rW - 32, GRAY_MID);

  var riskItems = [
    {
      badge: "RISK 1",
      title: "GL 월별 편차 극심",
      desc:  "1월 3.2억 → 2월 0.85억 — 안정적 수주 체계 필요",
      color: RED_WARN
    },
    {
      badge: "RISK 2",
      title: "플래닛 B2B/B2G 8.4억 단일 건 집중",
      desc:  "계약 지연 시 전사 리스크",
      color: ORANGE
    },
    {
      badge: "RISK 3",
      title: "3월 파이프라인 $344K 미확정",
      desc:  "TestBox·Altos·Kalshi 모니터링 필수",
      color: ORANGE
    }
  ];

  riskItems.forEach(function(risk, i) {
    var iy = rY + 40 + i * 58;

    // 경고 배지
    addRect(slide, rX + 14, iy, 42, 16, risk.color);
    addText(slide, risk.badge, rX + 14, iy, 42, 16, {
      fontSize: 7.5, color: BLACK, bold: true, align: 'center'
    });

    // 제목
    addText(slide, risk.title, rX + 62, iy, rW - 78, 18, {
      fontSize: 9, color: WHITE, bold: true
    });

    // 설명
    addText(slide, risk.desc, rX + 16, iy + 20, rW - 32, 32, {
      fontSize: 8.5, color: TEXT_MUTED
    });
  });

  // 하단 메시지 바
  addBottomBar(slide,
    "GL 대형 계약 신규 수주가 2026의 핵심 변수. 파이프라인 관리가 곧 전사 목표 달성이다."
  );

  addSlideNumber(slide, 3);
}

// ============================================================
// 메인 함수
// ============================================================

function addSlides() {
  var DECK_ID = "1LSW7jCnaxExn3sgp84gVRQdLCjBEUzJUNAPtb1RWabM";

  try {
    var pres = SlidesApp.openById(DECK_ID);

    // SLIDE 1
    try {
      buildSlide1(pres);
      Logger.log("[OK] Slide 1 추가 완료: 2025 결산");
    } catch (e) {
      Logger.log("[ERROR] Slide 1 실패: " + e.message);
    }

    // SLIDE 2
    try {
      buildSlide2(pres);
      Logger.log("[OK] Slide 2 추가 완료: 2026 YTD");
    } catch (e) {
      Logger.log("[ERROR] Slide 2 실패: " + e.message);
    }

    // SLIDE 3
    try {
      buildSlide3(pres);
      Logger.log("[OK] Slide 3 추가 완료: 사업부별 목표 vs 현실");
    } catch (e) {
      Logger.log("[ERROR] Slide 3 실패: " + e.message);
    }

    var url = "https://docs.google.com/presentation/d/" + DECK_ID + "/edit";
    Logger.log("============================================================");
    Logger.log("전체 완료! 슬라이드 3장 추가됨.");
    Logger.log("URL: " + url);
    Logger.log("============================================================");

  } catch (e) {
    Logger.log("[FATAL] 프레젠테이션 열기 실패: " + e.message);
  }
}
