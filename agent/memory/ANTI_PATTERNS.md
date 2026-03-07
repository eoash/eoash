# Anti-Patterns (오답노트)

AI 실수·재발 방지 기록. 팀원이 발견한 실수가 쌓일수록 AI는 더 똑똑해진다.

---

## 작성 규칙
- 날짜 + 한 줄 요약 + (선택) 상세 설명
- 해결되면 삭제하지 말고 ~~취소선~~ 처리 (학습 이력 보존)

---

## 기록

[2026-03-04] CLAUDE.md에 완료 항목([x])을 남겨두면 매 세션마다 불필요한 토큰 소비. 완료된 건 WORK_SUMMARY.md로 이동할 것.

[2026-03-04] company.md에 `[이름]`, `[주소]` 같은 플레이스홀더가 있으면 AI가 그대로 출력하거나 잘못된 추론을 함. 모르는 정보는 빈 칸보다 아예 빼는 게 나음.

[2026-03-04] workflows.md에 미구현 워크플로우를 "있는 것처럼" 적어두면 AI가 이미 작동하는 시스템으로 착각함. 미구현은 TODO 표시하거나 삭제.

[2026-03-04] git commit 시 터미널 3개를 동시에 쓰면 다른 터미널의 변경사항이 의도치 않게 포함될 수 있음. commit 전 `git status` 확인 필수.

[2026-03-04] Next.js 프로젝트에서 유틸 함수(getDateRange 등)를 constants.ts가 아닌 utils.ts에 배치할 것. 모듈 책임 분리: constants=설정값/매핑, utils=변환/포맷 함수.

[2026-03-07] Flip 관련 이메일은 절대 자동 발송 금지. 초안 작성까지만 하고, 발송은 무조건 서현님이 수동으로 직접 진행.

[2026-03-07] Prometheus query_range는 step을 start에 정렬. 고정 자정 start를 쓰면 오늘 자정 이후 데이터 누락됨. NOW 기준 rolling window(start=NOW-Ndays, end=NOW) 필수.

[2026-03-07] OTel resource attribute `user.email`은 실제 사용자 이메일과 정확히 일치해야 함. constants.ts 팀원 매핑과 불일치하면 대시보드에서 이름 매칭 실패.

[2026-03-07] Slack MCP 경유 메시지 발송은 Cloudflare WAF 차단에 취약. 한 세션에서 검색+읽기+발송을 다수 호출하면 차단되고, 세션 내 복구 불가. 공지/리마인더 등 자동화 메시지는 Bot Token 직접 사용 스크립트로 처리할 것.
