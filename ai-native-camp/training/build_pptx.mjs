import PptxGenJS from 'pptxgenjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"

// ── 색상 시스템 (Midnight Executive)
const C = {
  bg_dark:     '1A1F36',
  bg_light:    'F5F7FA',
  bg_white:    'FFFFFF',
  text_title:  '1A1F36',
  text_body:   '4A5568',
  text_muted:  '718096',
  text_white:  'FFFFFF',
  accent_blue: '4A7BF7',
  accent_cyan: '00D4AA',
  accent_gold: 'FFB020',
  accent_red:  'FF6B6B',
  border:      'E2E8F0',
};

// ── 폰트
const F = 'Pretendard';

// ── 공통 헬퍼
function titleBar(slide, title, sub = '') {
  slide.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 0.42, w: 1.4, h: 0.07,
    fill: { color: C.accent_blue }, line: { color: C.accent_blue },
  });
  slide.addText(title, {
    x: 0.6, y: 0.55, w: 11.5, h: 0.75,
    fontFace: F, fontSize: 36, bold: true,
    color: C.text_title, charSpacing: -0.3,
  });
  if (sub) {
    slide.addText(sub, {
      x: 0.6, y: 1.38, w: 10, h: 0.42,
      fontFace: F, fontSize: 17, color: C.text_muted,
    });
  }
}

function pageNum(slide, n, total) {
  slide.addText(`${n} / ${total}`, {
    x: 12.0, y: 7.05, w: 1.1, h: 0.28,
    fontFace: F, fontSize: 9, color: C.text_muted, align: 'right',
  });
}

function card(slide, x, y, w, h, title, body, accent = C.accent_blue) {
  slide.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08,
    fill: { color: C.bg_white },
    shadow: { type: 'outer', blur: 8, offset: 2, color: '00000012' },
    line: { color: C.border, width: 0.5 },
  });
  slide.addShape(pptx.shapes.RECTANGLE, {
    x, y, w, h: 0.07, fill: { color: accent }, line: { color: accent },
  });
  slide.addText(title, {
    x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.45,
    fontFace: F, fontSize: 18, bold: true, color: C.text_title,
  });
  slide.addText(body, {
    x: x + 0.2, y: y + 0.65, w: w - 0.4, h: h - 0.8,
    fontFace: F, fontSize: 15, color: C.text_body,
    lineSpacingMultiple: 1.5, valign: 'top',
  });
}

const TOTAL = 9;

// ══════════════════════════════════════════
// 슬라이드 1 — 표지 (Cover)
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_dark };

  // 배경 장식 — 우측 흐린 사각형
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 9.2, y: 0, w: 4.13, h: 7.5,
    fill: { color: '232942' }, line: { color: '232942' },
  });

  // accent 라인
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.7, y: 2.9, w: 1.6, h: 0.08,
    fill: { color: C.accent_cyan }, line: { color: C.accent_cyan },
  });

  // 메인 제목
  s.addText('우리는 AI를\n잘못 쓰고 있다', {
    x: 0.7, y: 1.4, w: 8.0, h: 3.0,
    fontFace: F, fontSize: 66, bold: true, color: C.text_white,
    lineSpacingMultiple: 1.15, charSpacing: -0.5,
  });

  // 부제목
  s.addText('ChatGPT, Gemini, Claude — 다들 쓰고 있다.\n근데 왜 업무가 별로 안 바뀐 것 같지?', {
    x: 0.7, y: 4.55, w: 8.0, h: 1.4,
    fontFace: F, fontSize: 20, color: 'A0AEC0',
    lineSpacingMultiple: 1.6,
  });

  // 우측 장식 숫자
  s.addText('AI', {
    x: 9.4, y: 1.2, w: 3.7, h: 5,
    fontFace: F, fontSize: 180, bold: true, color: '2D3561',
    align: 'center', valign: 'middle',
  });

  pageNum(s, 1, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 2 — 지금 밖에서 무슨 일이
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_white };
  titleBar(s, '지금 밖에서 무슨 일이 벌어지고 있나');

  // 카드 3개
  card(s, 0.6, 1.75, 3.9, 4.8,
    '💬 한 마디',
    '"토큰에 변화가 없던데?"\n\n설에 쉬는 회사 대표에게\n다른 회사 대표가 날린 한마디\n\n— Claude Code League 中',
    C.accent_blue
  );
  card(s, 4.7, 1.75, 3.9, 4.8,
    '🏢 인티그레이션 · 157명',
    '✓ 150명 (95%) 전환 완료\n✓ 마케터·인사·정산팀이 상위권\n✓ 정산팀이 자동화 툴 직접 개발\n✓ BO가 사내 시스템 직접 배포',
    C.accent_cyan
  );
  card(s, 8.8, 1.75, 3.93, 4.8,
    '⚠️ 임계점',
    '임계점을 넘은 팀원과\n못 넘은 팀원은\n\n"대화가 되지 않습니다"',
    C.accent_red
  );

  pageNum(s, 2, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 3 — AI도 슬랙도 기억하지 못한다
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_white };
  titleBar(s, 'AI도, 슬랙도 — 기억하지 못한다');

  // 좌측 카드
  card(s, 0.6, 1.75, 5.8, 3.9,
    '🤖 채팅 AI',
    '"분명히 설명했는데 왜 또 물어봐?"\n\n→ 대화창 닫으면 초기화\n→ 컨텍스트가 길어질수록 앞 내용을 잊는다',
    C.accent_blue
  );

  // 우측 카드
  card(s, 6.73, 1.75, 5.8, 3.9,
    '💬 슬랙',
    '"3개월 전 대화, 찾을 수 있나요?"\n\n→ 빠른 소통의 대가는 휘발\n→ 일주일 전 업무 요청, 지금 추적 가능한가요?',
    C.accent_gold
  );

  // 하단 결론 바
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 6.0, w: 12.13, h: 0.88,
    fill: { color: C.bg_dark }, line: { color: C.bg_dark },
  });
  s.addText('빠름의 대가가 \'휘발\'이다', {
    x: 0.6, y: 6.0, w: 12.13, h: 0.88,
    fontFace: F, fontSize: 22, bold: true,
    color: C.text_white, align: 'center', valign: 'middle',
  });

  pageNum(s, 3, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 4 — 터미널을 켜면 AI의 속이 보인다
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_white };
  titleBar(s, '터미널을 켜면 AI의 속이 보인다');

  const rows = [
    [
      { text: '기존 채팅 방식', options: { bold: true, fill: { color: 'E53E3E' }, color: C.text_white, fontFace: F, fontSize: 17, align: 'center', valign: 'middle' } },
      { text: '', options: { fill: { color: C.bg_light }, fontFace: F } },
      { text: 'Claude Code', options: { bold: true, fill: { color: '2B6CB0' }, color: C.text_white, fontFace: F, fontSize: 17, align: 'center', valign: 'middle' } },
    ],
    [
      { text: '✕  대화 → 사라짐', options: { color: 'E53E3E', fontFace: F, fontSize: 16, valign: 'middle' } },
      { text: '대화 저장', options: { color: C.text_muted, fontFace: F, fontSize: 14, align: 'center', valign: 'middle', fill: { color: C.bg_light } } },
      { text: '✓  대화 → 파일로 저장', options: { color: '276749', fontFace: F, fontSize: 16, valign: 'middle' } },
    ],
    [
      { text: '✕  프롬프트가 중요', options: { color: 'E53E3E', fontFace: F, fontSize: 16, valign: 'middle', fill: { color: 'FFF5F5' } } },
      { text: '핵심', options: { color: C.text_muted, fontFace: F, fontSize: 14, align: 'center', valign: 'middle', fill: { color: C.border } } },
      { text: '✓  컨텍스트가 중요', options: { color: '276749', fontFace: F, fontSize: 16, valign: 'middle', fill: { color: 'F0FFF4' } } },
    ],
    [
      { text: '✕  매번 설명 반복', options: { color: 'E53E3E', fontFace: F, fontSize: 16, valign: 'middle' } },
      { text: '설정', options: { color: C.text_muted, fontFace: F, fontSize: 14, align: 'center', valign: 'middle', fill: { color: C.bg_light } } },
      { text: '✓  한 번 설정 → 계속 기억', options: { color: '276749', fontFace: F, fontSize: 16, valign: 'middle' } },
    ],
    [
      { text: '✕  창 닫으면 초기화', options: { color: 'E53E3E', fontFace: F, fontSize: 16, valign: 'middle', fill: { color: 'FFF5F5' } } },
      { text: '기록', options: { color: C.text_muted, fontFace: F, fontSize: 14, align: 'center', valign: 'middle', fill: { color: C.border } } },
      { text: '✓  작업 히스토리가 쌓인다', options: { color: '276749', fontFace: F, fontSize: 16, valign: 'middle', fill: { color: 'F0FFF4' } } },
    ],
  ];

  s.addTable(rows, {
    x: 0.6, y: 1.72, w: 12.13,
    rowH: [0.62, 0.85, 0.85, 0.85, 0.85],
    colW: [4.8, 1.8, 5.53],
    border: { type: 'solid', pt: 0.5, color: C.border },
    margin: [6, 12, 6, 12],
  });

  pageNum(s, 4, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 5 — 프롬프트 잘 쓰는 시대는 끝났다
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();

  // 좌우 분할 배경
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 0, w: 5.5, h: 7.5,
    fill: { color: C.bg_dark }, line: { color: C.bg_dark },
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 5.5, y: 0, w: 7.83, h: 7.5,
    fill: { color: C.bg_white }, line: { color: C.bg_white },
  });

  // 좌측
  s.addText('Prompt\nEngineering', {
    x: 0.4, y: 1.4, w: 4.8, h: 2.2,
    fontFace: F, fontSize: 42, bold: true, color: C.text_white,
    lineSpacingMultiple: 1.2,
  });
  s.addText('"질문을 잘 써야 해"', {
    x: 0.4, y: 3.75, w: 4.8, h: 0.7,
    fontFace: F, fontSize: 19, color: 'A0AEC0',
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.4, y: 4.6, w: 2.0, h: 0.07,
    fill: { color: 'FF6B6B' }, line: { color: 'FF6B6B' },
  });
  s.addText('구시대', {
    x: 0.4, y: 4.75, w: 2.0, h: 0.4,
    fontFace: F, fontSize: 15, color: 'FC8181',
  });

  // 화살표
  s.addShape(pptx.shapes.RIGHT_ARROW, {
    x: 4.8, y: 3.3, w: 1.2, h: 0.8,
    fill: { color: C.accent_cyan }, line: { color: C.accent_cyan },
  });

  // 우측
  s.addText('지금은', {
    x: 6.2, y: 0.5, w: 6.8, h: 0.5,
    fontFace: F, fontSize: 16, color: C.text_muted,
  });
  s.addText('Context\nEngineering', {
    x: 6.2, y: 1.1, w: 6.8, h: 2.2,
    fontFace: F, fontSize: 42, bold: true, color: C.text_title,
    lineSpacingMultiple: 1.2,
  });
  s.addText('"정보를 잘 쌓아야 해"', {
    x: 6.2, y: 3.45, w: 6.8, h: 0.7,
    fontFace: F, fontSize: 19, color: C.text_body,
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 6.2, y: 4.1, w: 12.13 - 6.2 - 0.6, h: 0.07,
    fill: { color: C.accent_cyan }, line: { color: C.accent_cyan },
  });

  // 인사이트 박스
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 6.2, y: 4.4, w: 6.53, h: 1.5,
    rectRadius: 0.08,
    fill: { color: 'EBF8FF' }, line: { color: 'BEE3F8', width: 0.5 },
  });
  s.addText('잘 정리된 Notion 페이지\n=\nAI에게 주는 좋은 컨텍스트', {
    x: 6.4, y: 4.3, w: 6.13, h: 1.6,
    fontFace: F, fontSize: 16, color: '2B6CB0',
    lineSpacingMultiple: 1.6, align: 'center', valign: 'middle',
  });

  s.addText('5 / 9', {
    x: 12.0, y: 7.05, w: 1.1, h: 0.28,
    fontFace: F, fontSize: 9, color: C.text_muted, align: 'right',
  });
}

// ══════════════════════════════════════════
// 슬라이드 6 — 매일 쌓이면 복리가 된다
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_white };
  titleBar(s, '매일 쌓이면 복리가 된다');

  const steps = [
    { day: 'Day 1', title: 'CLAUDE.md 만들기', accent: C.accent_blue },
    { day: 'Day 7', title: 'AI가 내 업무\n스타일을 파악', accent: C.accent_cyan },
    { day: 'Day 30', title: '"이거 저번에 어떻게 했지?"\nAI가 기억한다', accent: C.accent_gold },
    { day: 'Day 90', title: '내 업무 히스토리가\n완성된다', accent: 'D53F8C' },
  ];

  steps.forEach((st, i) => {
    const x = 0.6 + i * 3.1;

    // 카드 배경
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.72, w: 2.85, h: 4.2,
      rectRadius: 0.1,
      fill: { color: C.bg_white },
      shadow: { type: 'outer', blur: 8, offset: 2, color: '00000014' },
      line: { color: C.border, width: 0.5 },
    });
    // 상단 accent
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 1.72, w: 2.85, h: 0.07,
      fill: { color: st.accent }, line: { color: st.accent },
    });
    // Day 라벨
    s.addText(st.day, {
      x: x + 0.15, y: 1.9, w: 2.55, h: 0.65,
      fontFace: F, fontSize: 32, bold: true, color: st.accent,
    });
    // 내용
    s.addText(st.title, {
      x: x + 0.15, y: 2.6, w: 2.55, h: 2.4,
      fontFace: F, fontSize: 17, color: C.text_body,
      lineSpacingMultiple: 1.5, valign: 'top',
    });

    // 화살표 (마지막 제외)
    if (i < 3) {
      s.addShape(pptx.shapes.RIGHT_ARROW, {
        x: x + 2.88, y: 3.4, w: 0.3, h: 0.4,
        fill: { color: C.text_muted }, line: { color: C.text_muted },
      });
    }
  });

  // 하단 결론
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 6.15, w: 12.13, h: 0.75,
    fill: { color: C.bg_dark }, line: { color: C.bg_dark },
  });
  s.addText('임계점을 넘으면, 일하는 방식이 달라진다', {
    x: 0.6, y: 6.15, w: 12.13, h: 0.75,
    fontFace: F, fontSize: 20, bold: true,
    color: C.text_white, align: 'center', valign: 'middle',
  });

  pageNum(s, 6, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 7 — Phase 1
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_light };

  // 상단 Phase 뱃지
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 0.3, w: 1.5, h: 0.42,
    rectRadius: 0.08,
    fill: { color: C.accent_blue }, line: { color: C.accent_blue },
  });
  s.addText('Phase 1', {
    x: 0.6, y: 0.3, w: 1.5, h: 0.42,
    fontFace: F, fontSize: 15, bold: true,
    color: C.text_white, align: 'center', valign: 'middle',
  });

  s.addText('나만의 업무 기록부터', {
    x: 2.3, y: 0.28, w: 10, h: 0.65,
    fontFace: F, fontSize: 32, bold: true, color: C.text_title,
  });

  const items = [
    { icon: '📄', title: '내 CLAUDE.md', sub: '= 내 업무 설명서', body: 'AI가 나를 기억하는 파일\n나만의 컨텍스트', accent: C.accent_blue },
    { icon: '📌', title: '매일 commit', sub: '= 내 업무 일지', body: '누가 시키지 않아도\n기록이 쌓인다', accent: C.accent_cyan },
    { icon: '⚡', title: '/wrap', sub: '= 자동 정리', body: '퇴근 전 한 번만 치면\nAI가 알아서 정리', accent: C.accent_gold },
  ];

  items.forEach((it, i) => {
    const x = 0.6 + i * 4.2;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.15, w: 3.9, h: 5.5,
      rectRadius: 0.1,
      fill: { color: C.bg_white },
      shadow: { type: 'outer', blur: 8, offset: 2, color: '00000012' },
      line: { color: C.border, width: 0.5 },
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x, y: 1.15, w: 3.9, h: 0.08,
      fill: { color: it.accent }, line: { color: it.accent },
    });
    s.addText(it.icon, {
      x: x + 0.2, y: 1.35, w: 3.5, h: 0.75,
      fontFace: F, fontSize: 36,
    });
    s.addText(it.title, {
      x: x + 0.2, y: 2.15, w: 3.5, h: 0.58,
      fontFace: F, fontSize: 22, bold: true, color: C.text_title,
    });
    s.addText(it.sub, {
      x: x + 0.2, y: 2.75, w: 3.5, h: 0.42,
      fontFace: F, fontSize: 16, color: it.accent, bold: true,
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: x + 0.2, y: 3.2, w: 3.3, h: 0.04,
      fill: { color: C.border }, line: { color: C.border },
    });
    s.addText(it.body, {
      x: x + 0.2, y: 3.35, w: 3.5, h: 2.0,
      fontFace: F, fontSize: 16, color: C.text_body,
      lineSpacingMultiple: 1.55,
    });
  });

  // 하단 문장
  s.addText('내일 아침, Claude Code를 켜는 것부터 시작입니다', {
    x: 0.6, y: 6.88, w: 12.13, h: 0.42,
    fontFace: F, fontSize: 16, color: C.text_muted,
    align: 'center', italic: true,
  });

  pageNum(s, 7, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 8 — Phase 2
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_white };

  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 0.3, w: 1.5, h: 0.42,
    rectRadius: 0.08,
    fill: { color: 'D53F8C' }, line: { color: 'D53F8C' },
  });
  s.addText('Phase 2', {
    x: 0.6, y: 0.3, w: 1.5, h: 0.42,
    fontFace: F, fontSize: 15, bold: true,
    color: C.text_white, align: 'center', valign: 'middle',
  });
  s.addText('팀이 함께 쌓으면', {
    x: 2.3, y: 0.28, w: 10, h: 0.65,
    fontFace: F, fontSize: 32, bold: true, color: C.text_title,
  });
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 0.95, w: 12.13, h: 0.06,
    fill: { color: C.border }, line: { color: C.border },
  });

  // 공유 지능 라벨
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: 1.2, w: 2.5, h: 0.5,
    rectRadius: 0.06,
    fill: { color: 'FED7E2' }, line: { color: 'FED7E2' },
  });
  s.addText('공유 지능', {
    x: 0.6, y: 1.2, w: 2.5, h: 0.5,
    fontFace: F, fontSize: 17, bold: true, color: 'C53030',
    align: 'center', valign: 'middle',
  });

  const qas = [
    { q: '"지은님이 저번 주에 뭐 하셨죠?"', a: 'AI가 알고 있다', accent: C.accent_blue },
    { q: '"이 업무 누가 담당하고 있죠?"',   a: 'AI가 알고 있다', accent: C.accent_cyan },
    { q: '"비슷한 거 예전에 해봤나요?"',    a: 'AI가 찾아준다', accent: C.accent_gold },
  ];

  qas.forEach((qa, i) => {
    const y = 2.0 + i * 1.42;
    s.addShape(pptx.shapes.ROUNDED_RECTANGLE, {
      x: 0.6, y, w: 12.13, h: 1.22,
      rectRadius: 0.08,
      fill: { color: C.bg_light }, line: { color: C.border, width: 0.5 },
    });
    s.addShape(pptx.shapes.RECTANGLE, {
      x: 0.6, y, w: 0.08, h: 1.22,
      fill: { color: qa.accent }, line: { color: qa.accent },
    });
    s.addText(qa.q, {
      x: 0.9, y: y + 0.15, w: 8.0, h: 0.48,
      fontFace: F, fontSize: 19, color: C.text_title,
    });
    s.addText(qa.a, {
      x: 0.9, y: y + 0.65, w: 8.0, h: 0.45,
      fontFace: F, fontSize: 18, bold: true, color: qa.accent,
    });
  });

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0.6, y: 6.75, w: 12.13, h: 0.04,
    fill: { color: C.border }, line: { color: C.border },
  });
  s.addText('슬랙 대화가 아니라, git 히스토리가 팀의 기억이 됩니다', {
    x: 0.6, y: 6.88, w: 12.13, h: 0.4,
    fontFace: F, fontSize: 12, color: C.text_muted,
    align: 'center', italic: true,
  });

  pageNum(s, 8, TOTAL);
}

// ══════════════════════════════════════════
// 슬라이드 9 — CTA
// ══════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.background = { color: C.bg_dark };

  // 배경 장식
  s.addShape(pptx.shapes.RECTANGLE, {
    x: 0, y: 5.5, w: 13.33, h: 2.0,
    fill: { color: '141829' }, line: { color: '141829' },
  });

  s.addText('오늘 저녁부터', {
    x: 0.8, y: 0.6, w: 11.7, h: 0.7,
    fontFace: F, fontSize: 24, color: 'A0AEC0',
    align: 'center',
  });
  s.addText('딱 이것만', {
    x: 0.8, y: 1.2, w: 11.7, h: 1.5,
    fontFace: F, fontSize: 68, bold: true, color: C.text_white,
    align: 'center', charSpacing: -0.5,
  });

  s.addShape(pptx.shapes.RECTANGLE, {
    x: 5.2, y: 2.75, w: 2.9, h: 0.06,
    fill: { color: C.accent_cyan }, line: { color: C.accent_cyan },
  });

  const actions = [
    { num: '①', text: 'Claude Code 설치', accent: C.accent_cyan },
    { num: '②', text: '내일 아침, PC 켜면 Claude Code도 켠다', accent: C.accent_gold },
    { num: '③', text: '퇴근 전  /wrap  →  commit  →  push  →  PC 끈다', accent: 'FC8181' },
  ];

  actions.forEach((a, i) => {
    const y = 3.1 + i * 0.9;
    s.addText(a.num, {
      x: 2.5, y, w: 0.6, h: 0.72,
      fontFace: F, fontSize: 20, bold: true, color: a.accent,
      align: 'right', valign: 'middle',
    });
    s.addText(a.text, {
      x: 3.3, y, w: 7.5, h: 0.72,
      fontFace: F, fontSize: 21, color: C.text_white,
      valign: 'middle',
    });
  });

  pageNum(s, 9, TOTAL);
}

// ── 저장
const outPath = path.join(__dirname, 'ai_native_intro_v2.pptx');
await pptx.writeFile({ fileName: outPath });
console.log('저장 완료:', outPath);
