/**
 * EO Studio — 2026년 2월 타운홀 재무 슬라이드 자동 생성
 *
 * 사용법:
 * 1. script.google.com 에서 새 프로젝트 생성
 * 2. 이 코드 전체 붙여넣기
 * 3. createFinanceSlides() 함수 선택 후 실행
 * 4. Google Drive에 "EO Studio - 2026.02 타운홀 재무 슬라이드" 파일 생성됨
 */

function createFinanceSlides() {
  const presentation = SlidesApp.create("EO Studio — 2026.02 타운홀 재무 슬라이드");

  // ──────────────────────────────────────────
  // 색상 팔레트
  // ──────────────────────────────────────────
  const COLOR = {
    BLACK:      "#0D0D0D",
    WHITE:      "#FFFFFF",
    GRAY_DARK:  "#1E1E1E",
    GRAY_MID:   "#2E2E2E",
    GRAY_LIGHT: "#F5F5F5",
    ACCENT:     "#E8FF47",   // EO 시그니처 옐로우
    TEXT_MUTED: "#888888",
    GREEN:      "#4CAF50",
    RED:        "#F44336",
    BLUE:       "#2196F3",
  };

  // 슬라이드 기본 사이즈 (16:9 — 720×405pt)
  const W = 720;
  const H = 405;

  // ──────────────────────────────────────────
  // 유틸 함수
  // ──────────────────────────────────────────
  function setSlideBackground(slide, color) {
    slide.getBackground().setSolidFill(color);
  }

  function addText(slide, text, x, y, w, h, opts) {
    const box = slide.insertTextBox(text, x, y, w, h);
    const style = box.getText().getTextStyle();
    style.setFontSize(opts.size || 16);
    style.setForegroundColor(opts.color || COLOR.WHITE);
    style.setBold(opts.bold || false);
    if (opts.font) style.setFontFamily(opts.font);
    box.getText().getParagraphStyle().setSpaceAbove(0);
    box.getText().getParagraphStyle().setSpaceBelow(0);

    const para = box.getText().getParagraphStyle();
    if (opts.align === "center") para.setParagraphAlignment(SlidesApp.ParagraphAlignment.CENTER);
    if (opts.align === "right")  para.setParagraphAlignment(SlidesApp.ParagraphAlignment.END);

    box.setContentAlignment(SlidesApp.ContentAlignment.MIDDLE);
    box.getBorder().setTransparent();
    return box;
  }

  function addRect(slide, x, y, w, h, color, opacity) {
    const rect = slide.insertShape(SlidesApp.ShapeType.RECTANGLE, x, y, w, h);
    rect.getFill().setSolidFill(color, opacity || 1);
    rect.getBorder().setTransparent();
    return rect;
  }

  function addLine(slide, x, y, length, color) {
    const line = slide.insertLine(
      SlidesApp.LineCategory.STRAIGHT,
      x, y, x + length, y
    );
    line.getLineFill().setSolidFill(color);
    line.setWeight(1);
    return line;
  }

  // ══════════════════════════════════════════
  // SLIDE 1 — 2026 Jan-Feb 매출 현황
  // ══════════════════════════════════════════
  const slide1 = presentation.getSlides()[0];
  setSlideBackground(slide1, COLOR.BLACK);

  // 상단 레이블
  addText(slide1, "FINANCE  ·  2026.02 타운홀", 40, 22, 400, 20, {
    size: 9, color: COLOR.TEXT_MUTED, bold: false
  });
  // 날짜
  addText(slide1, "2026.02.27", W - 130, 22, 120, 20, {
    size: 9, color: COLOR.TEXT_MUTED, align: "right"
  });
  addLine(slide1, 40, 46, W - 80, COLOR.GRAY_MID);

  // 헤드라인
  addText(slide1, "Jan – Feb 확정 매출", 40, 58, 400, 28, {
    size: 11, color: COLOR.TEXT_MUTED, bold: false
  });
  addText(slide1, "$824,200", 40, 82, 360, 52, {
    size: 46, color: COLOR.ACCENT, bold: true
  });
  addText(slide1, "≈ KRW 1.19B", 40, 134, 240, 20, {
    size: 12, color: COLOR.TEXT_MUTED
  });

  // ── 좌측: 글로벌(US) 확정 ──
  addRect(slide1, 40, 165, 300, 210, COLOR.GRAY_DARK);
  addText(slide1, "🇺🇸  GLOBAL (US)", 52, 174, 280, 18, {
    size: 10, color: COLOR.ACCENT, bold: true
  });
  addText(slide1, "확정 매출   $746,200", 52, 196, 280, 16, { size: 10, color: COLOR.WHITE, bold: true });

  const usProjects = [
    ["TestBox",       "$150K"],
    ["Altos",         "$110K"],
    ["LayerZero",     "$110K"],
    ["Yanolja",       "$110K"],
    ["Kalshi",        " $80K"],
    ["Pebblebed VC",  " $60K"],
    ["Mem",           " $35K"],
    ["Protege",       " $30K"],
    ["Meridian",      " $30K"],
    ["Story",         " $30K"],
    ["a16z retainer", " $16K"],
    ["Lio",           " $15K"],
  ];
  let yPos = 216;
  usProjects.forEach(([name, amt]) => {
    addText(slide1, `· ${name}`, 56, yPos, 190, 11, { size: 8.5, color: "#CCCCCC" });
    addText(slide1, amt,         236, yPos, 90,  11, { size: 8.5, color: COLOR.WHITE, bold: true, align: "right" });
    yPos += 12;
  });

  // 미수금 박스
  addRect(slide1, 40, 354, 300, 20, "#FF6B00", 0.15);
  addText(slide1, "수금 대기 (정상 진행)   $78,000", 52, 357, 280, 14, {
    size: 8.5, color: "#FF9A3C", bold: true
  });

  // ── 우측: 한국 ──
  addRect(slide1, 355, 165, 325, 100, COLOR.GRAY_DARK);
  addText(slide1, "🇰🇷  KOREA", 368, 174, 300, 18, {
    size: 10, color: COLOR.ACCENT, bold: true
  });
  addText(slide1, "1월 실현 매출", 368, 196, 180, 14, { size: 9, color: COLOR.TEXT_MUTED });
  addText(slide1, "KRW 5.6M", 368, 210, 200, 18, { size: 14, color: COLOR.WHITE, bold: true });
  addText(slide1, "확정 프로젝트 파이프라인", 368, 232, 200, 14, { size: 9, color: COLOR.TEXT_MUTED });
  addText(slide1, "KRW 928M", 368, 246, 200, 18, { size: 14, color: COLOR.GREEN, bold: true });

  // ── 우측: 한국 프로젝트 상세 ──
  addRect(slide1, 355, 275, 325, 100, COLOR.GRAY_DARK);
  addText(slide1, "한국 확정 프로젝트 상세", 368, 282, 300, 14, {
    size: 9, color: COLOR.TEXT_MUTED
  });
  const krProjects = [
    ["H-OnDream",          "KRW 510M"],
    ["Asan Doers",         "KRW 180M"],
    ["SNU Startup Edu",    "KRW 100M"],
    ["Dongjak-gu SBA",     "KRW 100M"],
    ["KOICA Return",       " KRW 20M"],
    ["Redbull",            " KRW 18M"],
  ];
  let yPos2 = 298;
  krProjects.forEach(([name, amt]) => {
    addText(slide1, `· ${name}`, 368, yPos2, 200, 11, { size: 8.5, color: "#CCCCCC" });
    addText(slide1, amt,          535, yPos2, 130, 11, { size: 8.5, color: COLOR.WHITE, bold: true, align: "right" });
    yPos2 += 12;
  });

  // ── 핵심 메시지 ──
  addLine(slide1, 40, 380, W - 80, COLOR.GRAY_MID);

  // ══════════════════════════════════════════
  // SLIDE 2 — 연간 목표 & 파이프라인
  // ══════════════════════════════════════════
  const slide2 = presentation.appendSlide();
  setSlideBackground(slide2, COLOR.BLACK);

  addText(slide2, "FINANCE  ·  2026.02 타운홀", 40, 22, 400, 20, {
    size: 9, color: COLOR.TEXT_MUTED
  });
  addText(slide2, "2026.02.27", W - 130, 22, 120, 20, {
    size: 9, color: COLOR.TEXT_MUTED, align: "right"
  });
  addLine(slide2, 40, 46, W - 80, COLOR.GRAY_MID);

  addText(slide2, "연간 목표 시나리오", 40, 58, 400, 28, {
    size: 11, color: COLOR.TEXT_MUTED
  });
  addText(slide2, "Annual Revenue Projection", 40, 82, 500, 34, {
    size: 28, color: COLOR.WHITE, bold: true
  });

  // 시나리오 바 차트
  const scenarios = [
    { label: "Conservative",   value: "$4.2M",   krw: "~KRW 60.7B", barW: 200, color: COLOR.GRAY_MID,  note: "현재 페이스로 달성 가능" },
    { label: "Current Pace",   value: "$4.9M",   krw: "~KRW 71.5B", barW: 235, color: "#4A90D9",       note: "1-2월 기준 연환산" },
    { label: "Realistic",      value: "$5.5–6.5M",krw: "~KRW 80-94B",barW: 300, color: "#34C759",      note: "▶  우리가 노리는 구간" },
    { label: "Stretch Target", value: "$7.0M",   krw: "~KRW 101.2B",barW: 340, color: "#888888",       note: "H2 월 $650K+ 필요" },
  ];

  let sY = 138;
  scenarios.forEach((s, i) => {
    // 레이블
    addText(slide2, s.label, 40, sY, 130, 14, { size: 8.5, color: COLOR.TEXT_MUTED });
    // 바
    const bar = addRect(slide2, 175, sY + 1, s.barW, 14, s.color);
    // 금액
    addText(slide2, s.value, 175 + s.barW + 8, sY, 100, 14, {
      size: 10, color: s.label === "Realistic" ? COLOR.GREEN : COLOR.WHITE, bold: s.label === "Realistic"
    });
    // KRW
    addText(slide2, s.krw, 310, sY + 18, 180, 11, { size: 7.5, color: COLOR.TEXT_MUTED });
    // 노트
    addText(slide2, s.note, 500, sY, 200, 14, {
      size: 8, color: s.label === "Realistic" ? COLOR.GREEN : COLOR.TEXT_MUTED,
      bold: s.label === "Realistic"
    });
    sY += 44;
  });

  // 파이프라인 섹션
  addLine(slide2, 40, 335, W - 80, COLOR.GRAY_MID);
  addText(slide2, "주요 파이프라인 (2026 Q1-Q2)", 40, 342, 300, 16, {
    size: 9, color: COLOR.TEXT_MUTED
  });

  const pipeline = [
    "Altos AGM 풀 프로덕션 논의 중",
    "Tenex — 대형 프로젝트 mid-March 클로즈 타겟",
    "a16z-style Retainer 파트너십 1-2개 사 논의 중",
    "VC 다큐 시리즈 확장 (Accel, Felicis, Sequoia 등) Q2-Q3",
  ];
  let pX = 40;
  pipeline.forEach((p) => {
    addText(slide2, `· ${p}`, pX, 360, 330, 12, { size: 8, color: "#AAAAAA" });
    pX = pX === 40 ? 385 : 40;
  });

  // 핵심 메시지 박스
  addRect(slide2, 40, 383, W - 80, 16, COLOR.GRAY_DARK);
  addText(slide2, "현재 페이스 $4.9M은 보수 목표를 이미 넘어섭니다. 목표는 $6.5M — 필요하면 $7M.", 46, 385, W - 92, 12, {
    size: 8.5, color: COLOR.ACCENT, bold: true
  });

  // ══════════════════════════════════════════
  // SLIDE 3 — 법인 운영 현황
  // ══════════════════════════════════════════
  const slide3 = presentation.appendSlide();
  setSlideBackground(slide3, COLOR.BLACK);

  addText(slide3, "FINANCE  ·  2026.02 타운홀", 40, 22, 400, 20, {
    size: 9, color: COLOR.TEXT_MUTED
  });
  addText(slide3, "2026.02.27", W - 130, 22, 120, 20, {
    size: 9, color: COLOR.TEXT_MUTED, align: "right"
  });
  addLine(slide3, 40, 46, W - 80, COLOR.GRAY_MID);

  addText(slide3, "법인 운영 현황", 40, 58, 400, 28, {
    size: 11, color: COLOR.TEXT_MUTED
  });
  addText(slide3, "Entity & Operations Update", 40, 82, 500, 34, {
    size: 28, color: COLOR.WHITE, bold: true
  });

  // 카드 3개
  const cards = [
    {
      flag: "🇻🇳",
      title: "Vietnam",
      status: "진행 중",
      statusColor: "#FF9A3C",
      items: [
        "✅  법인 검증 (Verification) 완료",
        "⏳  Bizzi 법인카드 솔루션 검토 중",
        "⏳  신규 법인 계좌 개설 진행 중",
        "📋  베트남 법인 대출 계약서 준비 중",
      ]
    },
    {
      flag: "🇺🇸",
      title: "US Flip (Delaware)",
      status: "진행 중",
      statusColor: "#FF9A3C",
      items: [
        "✅  주주 공식 공지 발송 완료",
        "✅  정호석 변호사 검토 완료",
        "⏳  서명 패키지 주주 발송 예정",
        "📌  완료 시 미국 모회사 구조 확립",
      ]
    },
    {
      flag: "💰",
      title: "AR 수금 현황",
      status: "관리 중",
      statusColor: "#4A90D9",
      items: [
        "🇰🇷  Cliwant KRW 16.5M (수금 추적 중)",
        "🇺🇸  a16z Speedrun  $20K",
        "🇺🇸  FurtherAI  $20K",
        "🇺🇸  Eve / Boltz / Laravel  $38K",
      ]
    }
  ];

  cards.forEach((card, i) => {
    const cx = 40 + i * 222;
    addRect(slide3, cx, 138, 210, 230, COLOR.GRAY_DARK);

    // 플래그 + 타이틀
    addText(slide3, card.flag + "  " + card.title, cx + 12, 148, 190, 18, {
      size: 11, color: COLOR.WHITE, bold: true
    });

    // 상태 배지
    addRect(slide3, cx + 12, 170, 80, 14, card.statusColor, 0.2);
    addText(slide3, card.status, cx + 12, 171, 80, 12, {
      size: 8, color: card.statusColor, bold: true
    });

    addLine(slide3, cx + 12, 190, 186, COLOR.GRAY_MID);

    let itemY = 196;
    card.items.forEach(item => {
      addText(slide3, item, cx + 12, itemY, 186, 13, {
        size: 8, color: "#CCCCCC"
      });
      itemY += 15;
    });
  });

  // 하단 노트
  addLine(slide3, 40, 380, W - 80, COLOR.GRAY_MID);
  addText(slide3, "* $1 = KRW 1,450 기준 적용  ·  AR 자동화 Dry-run 완료, Production 전환 검토 예정", 40, 385, W - 80, 16, {
    size: 8, color: COLOR.TEXT_MUTED
  });

  // ──────────────────────────────────────────
  // 완료 메시지
  // ──────────────────────────────────────────
  const url = presentation.getUrl();
  Logger.log("✅ 슬라이드 생성 완료!");
  Logger.log("🔗 URL: " + url);

  // 완료 알림 (선택)
  SlidesApp.getUi().alert(
    "슬라이드 생성 완료 🎉\n\n" +
    "파일이 Google Drive에 저장되었습니다.\n" +
    "URL: " + url
  );
}
