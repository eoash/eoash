---
name: my-context-sync
description: EO Studio의 컨텍스트 싱크. Slack, Gmail, Calendar, Notion, GitHub, ClickUp에서 정보를 수집하고 하나의 문서로 정리. "싱크", "sync", "정보 수집" 요청에 사용.
triggers:
  - "싱크"
  - "sync"
  - "정보 수집"
  - "컨텍스트 싱크"
---

# My Context Sync - EO Studio

흩어진 정보를 한곳에 모아 정리하는 스킬.

Slack, Gmail, Google Calendar, Notion, GitHub, ClickUp, 그리고 agent/ 디렉토리의
운영 메모리에서 최근 정보를 수집하고 하나의 마크다운 문서로 통합한다.

**환경**: Windows PowerShell, Python 3.x, 기존 Google API credentials 활용

## 소스 정의

### 소스 1: Slack

| 항목 | 값 |
|------|-----|
| MCP 도구 | `mcp__claude_ai_Slack__slack_read_channel` |
| 수집 범위 | 최근 7일 |

수집할 채널 목록:

```yaml
channels:
  - name: "all-공지사항"      # 필수 공지사항
  - name: "2026-global-heads" # 글로벌 리더십 의사결정 (프라이빗)
  - name: "all-운영"         # 운영 이슈
  - name: "team-operation"   # 운영팀 업무
  - name: "all-프로젝트현황"  # 프로젝트 상태
  - name: "ai-lab"          # AI 연구/학습
  - name: "all-비즈니스"     # 비즈니스 논의
  - name: "team-gl-business" # 글로벌 비즈니스
  - name: "all-잡담"         # 아무말 대잔치
  - name: "pla-이오스쿨"     # B2B, B2G, 이오플래닛
  - name: "kr-all-chat"      # 한국팀 채팅
  - name: "all-무엇이든물어보살" # 고인물 Q&A
  - name: "all-gl-san-francisco" # Life in SF
  - name: "request-지출요청" # 지출요청 (매주 금요일)
  - name: "all-문의메일"     # 파트너 메일
```

수집 방법:
```
각 채널에 대해 mcp__claude_ai_Slack__slack_read_channel 호출.
채널명과 메시지 개수(limit)를 전달한다.

Connectors로 연결한 경우:
  mcp__claude_ai_Slack__slack_read_channel(channel="general", limit=50)

claude mcp add로 연결한 경우:
  mcp__slack__slack_read_channel(channel="general", limit=50)
  (도구명은 연결 방식에 따라 다를 수 있음. /mcp로 확인)
```

추출할 정보:
- 중요 공지사항
- 의사결정 사항 ("확정", "결정", "합의" 키워드)
- 나에게 멘션된 메시지
- 답장이 필요한 질문

**🔒 프라이빗 채널 보안 정책**:
- 프라이빗 채널(`2026-global-heads`)의 내용은 **로컬 markdown 파일에만 저장**
- Slack 또는 Notion에 Context Sync 결과를 공유할 때:
  - 프라이빗 채널 내용은 **절대 포함하지 않음**
  - 하이라이트/액션 아이템에서도 프라이빗 채널 출처 제외
- 로컬 파일에서는 프라이빗 채널을 명확히 표시: `## 📱 Slack (프라이빗: 2026-global-heads)`

### 소스 2: Gmail

| 항목 | 값 |
|------|-----|
| 실행 방법 | Python 스크립트 (Gmail API) |
| 수집 범위 | 최근 7일, 받은편지함 |

수집 방법:
```powershell
# Windows PowerShell
python .claude/skills/my-context-sync/scripts/gmail_fetch.py --days 7

# credentials.json 파일 사용 (프로젝트 루트에 존재)
```

추출할 정보:
- 안 읽은 이메일 수
- 중요 발신자 이메일 요약
- 회신이 필요한 이메일
- 일정 초대 (캘린더 연동)

### 소스 3: Google Calendar

| 항목 | 값 |
|------|-----|
| 실행 방법 | Python 스크립트 (Google Calendar API) |
| 수집 범위 | 오늘 ~ 7일 후 |

수집 방법:
```powershell
# Windows PowerShell
python .claude/skills/my-context-sync/scripts/calendar_fetch.py --days 7

# token.json 파일 사용 (프로젝트 루트에 존재)
```

추출할 정보:
- 오늘의 일정
- 이번 주 주요 미팅
- 준비가 필요한 미팅 (발표, 외부 미팅 등)
- 일정 충돌 여부

### 소스 4: Notion

| 항목 | 값 |
|------|-----|
| MCP 도구 | Notion MCP 서버 (`@notionhq/notion-mcp-server`) |
| 수집 범위 | 지정된 데이터베이스 |

```yaml
databases:
  - name: "업무 태스크"
    id: "your-database-id"
  - name: "프로젝트 현황"
    id: "your-database-id"
```

수집 방법:
```
Notion MCP 서버의 도구를 사용하여 데이터베이스를 조회한다.

연결 방법 (택 1):
  - Connectors: claude.ai/settings/connectors 에서 Notion 연결 (가장 쉬움)
  - 명령어: claude mcp add --transport http notion https://mcp.notion.com/mcp

호출 예시:
  mcp__notion__query_database(database_id="your-database-id")
```

추출할 정보:
- 진행 중인 태스크
- 기한이 임박한 항목
- 최근 업데이트된 페이지

### 소스 5: GitHub

| 항목 | 값 |
|------|-----|
| MCP 도구 | GitHub Plugin (설치됨) |
| 수집 범위 | 내 PR, 내 이슈, 최근 커밋 |

수집 방법:
```
GitHub 플러그인을 통해 자동 연결된 MCP 도구 사용.

호출 예시:
  - 내 PR 목록 조회
  - 내가 할당된 이슈 조회
  - 최근 커밋 내역 조회
```

추출할 정보:
- 오픈된 PR 상태
- 리뷰 요청된 PR
- 나에게 할당된 이슈
- 최근 커밋 요약

### 소스 6: ClickUp

| 항목 | 값 |
|------|-----|
| 실행 방법 | Python 스크립트 (ClickUp API) |
| 수집 범위 | 할당된 태스크, 최근 7일 활동 |

수집 방법:
```powershell
# Windows PowerShell
python .claude/skills/my-context-sync/scripts/clickup_fetch.py --days 7

# CLICKUP_API_TOKEN 환경 변수 사용 (.env 파일)
```

추출할 정보:
- 나에게 할당된 태스크
- 진행 중인 태스크 (In Progress)
- 마감 임박한 태스크 (7일 이내)
- 최근 업데이트된 태스크
- 완료된 태스크 (최근 7일)
- 태스크별 우선순위 (Urgent, High, Normal, Low)
- due date이 없는 태스크
- 오늘 생성한 태스크 (내가 오늘 만든 task)

## 실행 흐름

이 스킬이 트리거되면 아래 순서로 실행한다.

### 1단계: 병렬 수집

6개 소스를 **동시에** 수집한다. 서로 의존성이 없으므로 병렬 실행이 가능하다.

```
수집 시작
  ├── [소스 1] Slack 채널 메시지 수집      ─┐
  ├── [소스 2] Gmail 이메일 수집            │
  ├── [소스 3] Google Calendar 일정 수집    │
  ├── [소스 4] Notion 태스크 수집           ├── 병렬 실행
  ├── [소스 5] GitHub PR/이슈 수집          │
  └── [소스 6] ClickUp 태스크 수집         ─┘
수집 완료
```

각 소스 수집은 subagent(Task 도구)로 실행한다:

```
Task(description="Slack 수집", prompt="all-공지사항, 2026-global-heads, all-운영, team-operation, all-프로젝트현황, ai-lab, all-비즈니스, team-gl-business, all-잡담, pla-이오스쿨, kr-all-chat, all-무엇이든물어보살, all-gl-san-francisco, request-지출요청, all-문의메일 채널에서 최근 7일 메시지를 수집하라. 주의: 2026-global-heads는 프라이빗 채널이므로 보안 정책을 준수하라.")
Task(description="Gmail 수집", prompt="gmail_fetch.py를 실행하여 최근 7일 이메일을 수집하라")
Task(description="Calendar 수집", prompt="calendar_fetch.py를 실행하여 7일간 일정을 수집하라")
Task(description="Notion 수집", prompt="업무 태스크 DB에서 진행 중인 항목을 수집하라")
Task(description="GitHub 수집", prompt="내 PR, 할당된 이슈, 최근 커밋을 수집하라")
Task(description="ClickUp 수집", prompt="clickup_fetch.py를 실행하여 나에게 할당된 태스크, 진행 중인 태스크, 마감 임박 태스크, due date 없는 태스크, 오늘 생성한 태스크를 수집하라")
```

### 2단계: 결과 통합

수집된 정보를 하나의 문서로 합친다.

통합 규칙:
- 소스별 섹션으로 구분
- 각 섹션에서 "하이라이트" (중요 항목 3개 이내)를 선별
- 액션 아이템을 문서 하단에 모아서 정리
- 수집 실패한 소스는 "수집 실패" 표시와 함께 사유 기록

### 3단계: 문서 저장

결과 파일을 저장한다.

```
저장 위치: sync/YYYY-MM-DD-context-sync.md
```

### 4단계: 리포트

실행 결과를 사용자에게 보고한다.

```
싱크 완료!

수집 결과:
  Slack: 3개 채널, 47개 메시지
  Gmail: 12개 이메일 (안 읽음 5개)
  Calendar: 8개 일정
  Notion: 15개 태스크
  GitHub: 3개 PR, 5개 이슈
  ClickUp: 12개 태스크 (진행 중 5개, 마감 임박 3개, due date 없음 2개, 오늘 생성 2개)

하이라이트 3건:
  1. [Slack] #project-updates: 배포 일정 확정 (2/20)
  2. [Gmail] 파트너사 계약서 회신 필요 (기한: 2/18)
  3. [ClickUp] 긴급 태스크 2건 - API 통합, 보고서 작성

액션 아이템 5건:
  - [ ] 파트너사 계약서 회신
  - [ ] PR #123 리뷰
  - [ ] Slack #general 공지 확인
  - [ ] Notion 기한 초과 태스크 2건 처리
  - [ ] ClickUp 긴급 태스크 완료

파일 저장: sync/2026-02-16-context-sync.md
```

## 출력 포맷

출력 옵션:
1. **Markdown 파일** (기본) -- `sync/YYYY-MM-DD-context-sync.md`에 저장
   - 로컬에만 저장되므로 프라이빗 채널 내용 포함 가능
2. **Slack 메시지** -- 지정 채널에 요약 발송 (Slack MCP 필요)
   - ⚠️ **프라이빗 채널 내용 절대 포함 금지**
   - 퍼블릭 채널 내용만 요약하여 발송
3. **Notion 페이지** -- 지정 DB에 기록 (Notion MCP 필요)
   - ⚠️ **프라이빗 채널 내용 절대 포함 금지**
   - 퍼블릭 채널 내용만 기록

저장되는 마크다운 파일의 구조:

```markdown
# Context Sync - 2026-02-16

> 자동 수집 시각: 09:00

## 하이라이트

- **[Slack]** 배포 일정 2/20로 확정
- **[Gmail]** 파트너사 계약서 회신 필요 (기한 2/18)
- **[GitHub]** PR #123 리뷰 요청

## Slack

### #general
- 주간 회의 시간 변경 공지 (화 10시 → 수 11시)

### #project-updates
- v2.0 배포일 2/20 확정
- QA 테스트 완료

## Gmail

| 발신자 | 제목 | 상태 |
|--------|------|------|
| 파트너사 | 계약서 검토 요청 | 회신 필요 |
| 팀장 | 주간 보고 | 읽음 |

## Google Calendar

### 오늘 (2/16)
- 09:00 모닝 스탠드업 (30분)
- 14:00 파트너 미팅 (1시간)

### 이번 주
- 2/17 (월) 10:00 팀 미팅
- 2/20 (수) 배포일

## Notion

### 진행 중 태스크
- [ ] 랜딩페이지 디자인 (기한: 2/18)
- [ ] API 문서 작성 (기한: 2/20)
- [x] 사용자 테스트 완료

## GitHub

### Open PRs
- #123 feature/new-api (리뷰 요청)
- #124 fix/bug-login (승인 대기)

### Assigned Issues
- #45 API 성능 개선 (우선순위: High)
- #67 문서 업데이트

## ClickUp

### 긴급 태스크 (Urgent)
- [ ] API 통합 완료 (마감: 2/18, 진행 중)
- [ ] 주간 보고서 작성 (마감: 2/17, 미착수)

### 진행 중인 태스크 (In Progress)
- [ ] 랜딩페이지 리뉴얼 (마감: 2/25)
- [ ] 사용자 피드백 분석 (마감: 2/22)
- [ ] 데이터베이스 마이그레이션 (마감: 2/28)

### 마감 임박 (7일 이내)
- [ ] 클라이언트 미팅 준비 (마감: 2/19)
- [ ] 테스트 케이스 작성 (마감: 2/20)

### 최근 완료 (지난 7일)
- [x] 버그 수정 #234 (완료: 2/15)
- [x] 디자인 리뷰 (완료: 2/14)

### Due Date 없는 태스크
- [ ] 문서 정리 작업 (상태: 진행 중)
- [ ] 브레인스토밍 아이템 (상태: 대기)

### 오늘 생성한 태스크
- [ ] 새로운 기능 아이디어 정리 (생성: 오늘, 마감: 미정)
- [ ] 긴급 버그 수정 요청 (생성: 오늘, 마감: 2/20)

## 액션 아이템

- [ ] 파트너사 계약서 회신 (기한: 2/18)
- [ ] PR #123 리뷰 완료
- [ ] ClickUp 긴급 태스크 2건 완료
- [ ] 기한 초과 태스크 처리
- [ ] Slack 공지 확인 후 일정 반영
```
