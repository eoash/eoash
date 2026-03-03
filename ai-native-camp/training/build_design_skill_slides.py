from pathlib import Path

root = Path(r"C:\Users\ash\ai_native_design_skill_output")
slides_dir = root / "slides"
slides_dir.mkdir(parents=True, exist_ok=True)

outline = """# AI Native로 일하는 법 - Slide Outline

1. AI ≠ 채팅 = 컨텍스트 (오프닝)
2. 경각심: AI가 혼자 일할 수 있는 시간 (METR)
3. 경각심: 글로벌 변화 (해커톤 수상자)
4. 경각심: 한국 사례 (토큰 전쟁)
5. AI 활용 4단계 진화
6. 문제 진단: 채팅 중심 업무의 한계
7. 해결책: Claude Code와 컨텍스트 축적
8. Context Engineering 전환
9. 복리: Day 1 / Day 7 / Day 30
10. Phase 1: 개인 업무 기록 체계
11. Phase 2: 공유 지능 개념
12. Phase 2: 팀 오답노트 구조
13. Phase 2: 오답노트 실제 예시
14. 행동 지시: 오늘 저녁부터 딱 3가지
"""
(root / "slide-outline.md").write_text(outline, encoding="utf-8")

base_css = """
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 720pt;
  height: 405pt;
  font-family: 'Pretendard', 'Malgun Gothic', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding: 28pt 34pt;
}
:root {
  --bg-primary: #f7f8fc;
  --bg-secondary: #ffffff;
  --bg-dark: #1A1A1A;
  --text-primary: #1A1A1A;
  --text-secondary: #5d6472;
  --indigo: #5B6CF9;
  --alert: #FF5C35;
  --line: #dfe3ef;
}
h1 { font-size: 38pt; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
h2 { font-size: 20pt; font-weight: 700; letter-spacing: -0.01em; }
p { font-size: 14pt; line-height: 1.45; }
.small { font-size: 10pt; color: var(--text-secondary); }
.muted { color: var(--text-secondary); }
.alert { color: var(--alert); }
.indigo { color: var(--indigo); }
.section { display: flex; flex-direction: column; gap: 10pt; }
.row { display: flex; gap: 14pt; }
.col { flex: 1; }
.card {
  background: var(--bg-secondary);
  border: 1.5pt solid var(--line);
  border-radius: 10pt;
  padding: 14pt;
  display: flex;
  flex-direction: column;
  gap: 8pt;
}
.card-red { border-color: var(--alert); }
.card-indigo { border-color: var(--indigo); }
.badge {
  display: inline-block;
  border: 1pt solid var(--line);
  border-radius: 999pt;
  padding: 3pt 10pt;
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
hr { border: none; height: 1pt; background: var(--line); }
.dark {
  background: var(--bg-dark);
  color: #ffffff;
}
.dark p, .dark .muted, .dark .small { color: #d6d6d6; }
.dark .card { background: #262626; border-color: #3a3a3a; }
.dark .badge { border-color: #5a5a5a; }
"""

slides = {
1: """
<body>
  <section class=\"section\" style=\"height:100%; justify-content:center;\">
    <p class=\"badge\">AI NATIVE</p>
    <h1>AI ≠ 채팅 = 컨텍스트</h1>
    <p class=\"muted\">대화는 날아가고, 맥락은 복리로 쌓인다.<br>우리 팀을 위한 공유 지능 구축기.</p>
  </section>
</body>
""",
2: """
<body>
  <section class=\"section\" style=\"gap:14pt;\">
    <h2>AI가 혼자 일할 수 있는 시간</h2>
    <p class=\"muted\">모델 순위보다 중요한 지표: AI가 인간 업무를 대체할 수 있는 연속 작업 시간</p>
    <div class=\"row\" style=\"gap:8pt; align-items:flex-end; height:190pt;\">
      <div class=\"col card\"><p>2019 GPT-2</p><p class=\"alert\">2초</p></div>
      <div class=\"col card\"><p>2023 GPT-4</p><p class=\"alert\">3분</p></div>
      <div class=\"col card\"><p>2024 C3.5</p><p class=\"alert\">11분</p></div>
      <div class=\"col card\"><p>2024말 o1</p><p class=\"alert\">38분</p></div>
      <div class=\"col card card-indigo\"><p>2025초 C3.7</p><p class=\"indigo\">1시간</p></div>
      <div class=\"col card card-indigo\"><p>2025말 O4.5</p><p class=\"indigo\">5시간</p></div>
      <div class=\"col card card-red\"><p>2026 O4.6</p><p class=\"alert\">14.5시간</p></div>
    </div>
    <p class=\"alert\">핵심: 약 7개월마다 2배 성장</p>
    <p class=\"small\">출처: metr.org/blog/2025-03-19-measuring-ai-ability-to-complete-long-tasks/</p>
  </section>
</body>
""",
3: """
<body>
  <section class=\"section\">
    <h2>지금 밖에서 무슨 일이 벌어지고 있나</h2>
    <div class=\"card card-red\">
      <p>Claude Code 해커톤 수상자 다수는 전통적 개발자가 아니다.</p>
      <p>금상: Mike Brown (상해 전문 변호사)</p>
      <p>은상: Jon McBee (12살 딸을 둔 아버지)</p>
      <p>동상: Michal Nedoszytko (심장내과 과장)</p>
      <p>Creative: Asep Bagja Priandana (뮤지션)</p>
      <p>Keep Thinking: Kyeyune Kazibwe (인프라 엔지니어)</p>
    </div>
    <p class=\"alert\">경쟁력의 축이 "만드는 기술"에서 "문제를 정의하는 능력"으로 이동 중</p>
  </section>
</body>
""",
4: """
<body>
  <section class=\"section\">
    <h2>한국에서도 이미 이렇게 일하고 있다</h2>
    <div class=\"card\">
      <p>메디스트림·렛서 Claude Code 토큰 전쟁 핵심</p>
      <p>1) 157명 중 150명(95%)이 기본 workflow 전환</p>
      <p>2) 상위 토큰 사용자는 개발자보다 비개발 직군 비중 높음</p>
      <p>3) 정산팀 자동화 제작, BO 사내 시스템 배포</p>
      <p>4) 기획이 개발, 디자이너가 프론트 배포</p>
      <p>5) 임계점 전/후 팀원 간 협업 언어 자체가 갈림</p>
    </div>
    <p class=\"alert\">AI 전문회사가 아닌 병원 플랫폼 회사의 실제 사례</p>
    <p class=\"small\">출처: 정희범 CEO LinkedIn</p>
  </section>
</body>
""",
5: """
<body>
  <section class=\"section\">
    <h2>AI 활용은 4단계로 진화하고 있다</h2>
    <div class=\"row\">
      <div class=\"col card card-red\"><p><b>1단계 Prompt</b></p><p>질문 잘 쓰기</p><p>단발성</p><p class=\"alert\">대부분이 여기</p></div>
      <div class=\"col card card-indigo\"><p><b>2단계 Context</b></p><p>CLAUDE.md 세팅</p><p>규칙 지속 기억</p></div>
      <div class=\"col card card-indigo\"><p><b>3단계 Compound</b></p><p>팀 공유 + 도구 결합</p><p>조직 자동화</p></div>
      <div class=\"col card card-indigo\"><p><b>4단계 Harness</b></p><p>자율 루프</p><p>24h 운영</p></div>
    </div>
    <p class=\"alert\">채팅 단계에 머물면 임계점을 넘지 못한다</p>
  </section>
</body>
""",
6: """
<body>
  <section class=\"section\">
    <h2>AI를 채팅으로만 쓰면 생기는 일</h2>
    <div class=\"row\">
      <div class=\"col card card-red\">
        <p><b>웹 채팅</b></p>
        <p>설명했는데 또 물어봄</p><p>창 닫으면 초기화</p><p>긴 대화에서 맥락 손실</p>
      </div>
      <div class=\"col card card-red\">
        <p><b>슬랙</b></p>
        <p>빠르지만 휘발</p><p>3개월 전 판단 근거 추적 불가</p><p>팀 기억 단절</p>
      </div>
    </div>
    <p>채팅은 빠르다. 하지만 남지 않으면 쌓이지 않는다.</p>
  </section>
</body>
""",
7: """
<body>
  <section class=\"section\">
    <h2>터미널을 켜면 AI의 속이 보인다</h2>
    <div class=\"row\">
      <div class=\"col card card-red\"><p><b>기존 채팅</b></p><p>대화 소멸</p><p>프롬프트 의존</p><p>반복 설명</p></div>
      <div class=\"col card card-indigo\"><p><b>Claude Code</b></p><p>대화 파일화</p><p>컨텍스트 중심</p><p>히스토리 축적</p></div>
    </div>
  </section>
</body>
""",
8: """
<body>
  <section class=\"section\">
    <h2>프롬프트 잘 쓰는 시대는 끝났다</h2>
    <div class=\"row\">
      <div class=\"col card card-red\"><p><b>Prompt Engineering</b></p><p>질문 품질이 성패</p></div>
      <div class=\"col card card-indigo\"><p><b>Context Engineering</b></p><p>정보 구조가 성패</p></div>
    </div>
    <div class=\"card\">
      <p>CLAUDE.md: 규칙·스타일 저장</p>
      <p>Notion: 구조화된 페이지를 컨텍스트로 활용</p>
      <p>Obsidian/메모앱: 마크다운 업무 기록 누적</p>
    </div>
    <p class=\"muted\">도구는 바뀌어도, AI가 읽을 수 있는 정보 습관은 남는다.</p>
  </section>
</body>
""",
9: """
<body>
  <section class=\"section\" style=\"height:100%; justify-content:center;\">
    <h2>매일 쌓이면 복리가 된다</h2>
    <div class=\"row\">
      <div class=\"col card\"><p><b>Day 1</b></p><p>Claude Code를 켜고<br>아무 업무나 실행</p></div>
      <div class=\"col card\"><p><b>Day 7</b></p><p>사소한 업무까지 전부 적용<br>메모와 CLAUDE.md 정리</p></div>
      <div class=\"col card card-indigo\"><p><b>Day 30</b></p><p>AI가 추가 질문 없이<br>맥락 기반으로 즉시 실행</p></div>
    </div>
    <p class=\"alert\">임계점을 넘으면 일하는 방식이 바뀐다</p>
  </section>
</body>
""",
10: """
<body>
  <section class=\"section\">
    <h2>Phase 1 - 나만의 업무 기록부터</h2>
    <div class=\"row\">
      <div class=\"col card\"><p><b>내 CLAUDE.md</b></p><p>AI가 나를 기억하는 업무 설명서</p></div>
      <div class=\"col card\"><p><b>매일 commit</b></p><p>업무 저장점이 자동으로 일지가 됨</p></div>
      <div class=\"col card\"><p><b>/wrap</b></p><p>퇴근 전 자동 요약과 다음 할 일 추출</p></div>
    </div>
    <p class=\"alert\">내일 아침, Claude Code를 켜는 것부터 시작</p>
  </section>
</body>
""",
11: """
<body>
  <section class=\"section\">
    <h2>Phase 2 - 팀이 함께 쌓으면: 공유 지능</h2>
    <div class=\"card card-indigo\">
      <p>"지은님이 저번 주에 뭐 하셨죠?" -> AI가 알고 있다</p>
      <p>"이 업무 누가 담당하고 있죠?" -> AI가 알고 있다</p>
      <p>"비슷한 거 예전에 해봤나요?" -> AI가 찾아준다</p>
    </div>
    <p>슬랙 로그가 아니라 git 히스토리가 팀의 기억이 된다.</p>
  </section>
</body>
""",
12: """
<body>
  <section class=\"section\">
    <h2>CLAUDE.md를 팀의 오답노트로 쓴다</h2>
    <div class=\"card\">
      <p>1. 팀 역할: 목적과 주요 업무 한 줄 정의</p>
      <p>2. 컨텍스트 경로: Notion/공유폴더/성공사례 링크</p>
      <p>3. 규칙·톤앤매너: 문서 구조, 어조, 데이터 표기 기준</p>
      <p>4. 오답노트: AI 실수를 누적 기록해 재발 방지</p>
      <p>5. 필수 workflow: Plan -> 검증 -> /wrap</p>
    </div>
    <p class=\"alert\">실수가 쌓일수록 팀 AI는 더 정확해진다</p>
  </section>
</body>
""",
13: """
<body>
  <section class=\"section\">
    <h2>이렇게 쌓인다</h2>
    <div class=\"card\" style=\"background:#1A1A1A; border-color:#1A1A1A;\">
      <p style=\"font-family:Consolas, monospace; color:#fff;\">팀 공용 오답노트 (Anti-patterns)</p>
      <p style=\"font-family:Consolas, monospace; color:#fff;\">[03.15] 2022년 이전 경쟁사 데이터 인용 금지</p>
      <p style=\"font-family:Consolas, monospace; color:#fff;\">[03.20] 회의록 요약: 결정사항 + 다음 할 일만</p>
      <p style=\"font-family:Consolas, monospace; color:#fff;\">[04.02] 코드 작성: 가짜 API 엔드포인트 생성 금지</p>
    </div>
    <p class=\"alert\">한 명이 발견하면 팀 전체가 같은 실수를 피한다</p>
  </section>
</body>
""",
14: """
<body class=\"dark\">
  <section class=\"section\" style=\"height:100%; justify-content:center; gap:14pt;\">
    <p class=\"badge\">오늘 저녁부터</p>
    <h1 style=\"color:#fff;\">딱 이것만</h1>
    <div class=\"card\">
      <p>① Claude Code 설치</p>
      <p>② 아침에 PC 켜면 Claude Code도 즉시 실행</p>
      <p>③ 퇴근 전: /wrap -> commit -> push</p>
    </div>
    <p class=\"small\">/wrap: 자동 정리 | commit: 저장점 | push: 팀 공유</p>
    <p class=\"alert\">이 3개를 반복하면 컨텍스트 복리가 시작된다</p>
  </section>
</body>
""",
}

html_head = """<!DOCTYPE html>
<html lang=\"ko\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css\">
  <style>{css}</style>
</head>
"""

for i in range(1, 15):
    html = html_head.format(css=base_css) + slides[i] + "\n</html>\n"
    (slides_dir / f"slide-{i:02d}.html").write_text(html, encoding="utf-8")

print(root)
print("slides:", len(list(slides_dir.glob("slide-*.html"))))
