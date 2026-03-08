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

[2026-03-08] `git stash` 사용 금지. 세션 간 작업 전환 시 stash pop 충돌로 working tree 변경사항 대량 유실됨 (아바타 27명, 막대그래프, 평균선, 이메일 sanitize, unavailable 카드 수정 등 전부 유실). 임시 저장이 필요하면 `git checkout -b temp-wip && git commit -m "WIP"` 사용 → 충돌 시에도 커밋 히스토리에서 복구 가능.

[2026-03-08] `python3 -c "..."` 안에서 `'''$VAR'''` 사용 시, VAR이 `'`로 끝나면 `''''`가 되어 SyntaxError. 환경변수(`VAR_ENV="$VAR" python3 -c "os.environ['VAR_ENV']"`)로 전달이 안전.

[2026-03-08] `python3 -c "..."` 안에서 `existing[\"key\"]`처럼 `\"`를 쓰면 셸 환경에 따라 이스케이프가 깨짐. f-string + dict 접근 대신 `.get()` + 문자열 연결(`+`)으로 따옴표 충돌 회피.

[2026-03-08] Prometheus는 마지막 스크랩 후 5분 경과하면 stale 처리. Gemini CLI처럼 간헐적 push 메트릭은 instant query에서 사라짐. `last_over_time(metric[충분한_기간])`으로 래핑 필수.

[2026-03-08] AI에게 "Windows 호환 고쳐줘" 요청 시, AI가 이해 못하는 코드 3,968줄을 삭제한 브랜치 생성. 머지 전 반드시 `git diff --stat`으로 삭제 규모 확인.

[2026-03-08] jemin 이메일 이중 도메인(`a@b@c`) 버그 3회 재발. 원인: (1) backfill JSON 원본에 잘못된 이메일, (2) 수정했지만 git stash 유실로 원복, (3) Prometheus에 이미 저장된 오염 데이터. 방어 레이어 3중 구축 필요: backfill 로드 시 sanitize + Prometheus 수신 시 sanitize + 원본 JSON 직접 수정.
