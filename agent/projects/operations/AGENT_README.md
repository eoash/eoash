# Operations Agent

## 역할 (Role)

**운영 자동화 에이전트** - 일상적인 운영 업무를 자동화하고, 팀 커뮤니케이션을 관리하며, 프로젝트 진행 상황을 모니터링하는 에이전트

## 책임 범위 (Responsibilities)

### 1. 일정 및 태스크 관리
- ClickUp 태스크 자동 생성 및 업데이트
- 일일 TODO 자동 발송 (Slack)
- 프로젝트 진행 상황 추적
- 마감일 알림 및 리마인더
- Overdue 태스크 에스컬레이션

### 2. Slack 커뮤니케이션 자동화
- 일일 standup 리마인더
- 주간 회고 및 계획 수집
- 중요 알림 자동 발송
- 채널별 메시지 라우팅
- 반복 메시지 스케줄링

### 3. 보고서 자동화
- 일일 업무 일지 (Daily Journal)
- 주간 진행 리포트
- 월간 운영 요약
- KPI 대시보드 업데이트

### 4. 문서 및 지식 관리
- Notion 워크스페이스 관리
- 문서 자동 업데이트
- 프로세스 문서화
- 온보딩 자료 관리

### 5. 시스템 모니터링
- 자동화 스크립트 상태 체크
- API 연결 상태 모니터링
- 에러 알림 및 복구
- 시스템 헬스 체크

## 사용하는 도구 (Tools)

### API 통합
- **ClickUp API**: 태스크 및 프로젝트 관리
- **Slack API**: 메시지 발송 및 채널 관리
- **Notion API**: 워크스페이스 및 데이터베이스 관리
- **Gmail API**: 이메일 자동화
- **Google Calendar API**: 일정 동기화

### 핵심 컴포넌트
- `scripts/daily_journal.py`: 일일 업무 일지 자동화
- `scripts/send_daily_todo.py`: 일일 TODO 발송
- `ash_bot/operations/task_manager.py`: ClickUp 태스크 관리
- `ash_bot/operations/slack_automator.py`: Slack 자동화
- `ash_bot/operations/report_generator.py`: 리포트 생성
- `onboarding/app.py`: Slack Bolt 온보딩 챗봇 (missions.yaml 기반, thread-safe)
- `onboarding/src/db_manager.py`: SQLite 진행 상황 관리 (threading.Lock, 인덱스)
- `onboarding/src/mission_engine.py`: missions.yaml 기반 미션 순서 엔진

## 워크플로우 (Workflows)

### 일일 TODO 발송 (Daily TODO)
```
1. ClickUp에서 오늘 마감 태스크 조회
2. 우선순위별로 정렬
3. Markdown 포맷으로 TODO 리스트 생성
4. Slack DM으로 발송 (오전 9시)
5. 완료 여부 추적 및 저녁 리마인더 (미완료 시)
```

### 일일 업무 일지 (Daily Journal)
```
1. 오늘 완료한 태스크 수집 (ClickUp)
2. 주요 커뮤니케이션 요약 (Slack, Gmail)
3. 중요 결정 사항 및 이슈 기록
4. Markdown 일지 생성
5. Notion에 자동 저장
6. 저녁 9시에 Slack으로 요약 발송
```

### 주간 진행 리포트 (Weekly Progress Report)
```
1. 지난 주 완료 태스크 집계 (ClickUp)
2. 프로젝트별 진행률 계산
3. Blocker 및 리스크 식별
4. 다음 주 우선순위 태스크 추출
5. Executive summary 생성
6. 월요일 오전 Slack 발송
7. Notion에 아카이브
```

### Slack Standup 자동화 (Slack Standup)
```
1. 매일 오전 9시 standup 리마인더 발송
2. 팀원 응답 수집:
   - 어제 한 일
   - 오늘 할 일
   - Blocker
3. 응답 집계 및 요약
4. 팀 채널에 standup 요약 게시
5. Blocker는 별도 스레드로 follow-up
```

### 태스크 에스컬레이션 (Task Escalation)
```
1. Overdue 태스크 일일 체크
2. 에스컬레이션 기준:
   - 3일 overdue: 담당자에게 DM
   - 7일 overdue: 매니저에게 알림
   - 14일 overdue: 긴급 회의 요청
3. Slack 알림 발송
4. ClickUp 태스크 우선순위 자동 상향
```

### 시스템 헬스 체크 (System Health Check)
```
1. 매시간 주요 API 연결 체크:
   - Bill.com
   - Plaid
   - ClickUp
   - Slack
   - Notion
2. 응답 시간 측정
3. 에러율 계산
4. 임계값 초과 시 Slack 알림
5. 자동 재시도 (3회)
6. 복구 실패 시 에스컬레이션
```

## 설정 및 파라미터

### Daily Schedule
```python
SCHEDULES = {
    "daily_todo": "09:00 UTC",          # 일일 TODO
    "standup_reminder": "09:00 UTC",    # Standup 리마인더
    "daily_journal": "21:00 UTC",       # 일일 일지
    "task_check": "09:00, 15:00 UTC",   # 태스크 체크 (2회)
}
```

### Escalation Thresholds
```python
ESCALATION = {
    "overdue_days_warning": 3,      # 3일: 경고
    "overdue_days_manager": 7,      # 7일: 매니저 알림
    "overdue_days_critical": 14,    # 14일: 긴급
}
```

### System Health Thresholds
```python
HEALTH_CHECK = {
    "response_time_warning_ms": 5000,   # 5초 이상
    "error_rate_warning": 0.05,         # 5% 이상
    "consecutive_failures": 3,          # 연속 3회 실패
}
```

## 메모리 및 컨텍스트 (Memory & Context)

### Context Files
- `context/team_structure.md`: 팀 구조 및 책임 분담
- `context/workflows.md`: 표준 운영 프로세스
- `context/communication_channels.md`: Slack 채널 매핑
- `context/automation_schedule.md`: 자동화 스케줄 정의

### Memory Files
- `memory/active_projects.md`: 진행 중인 프로젝트 목록
- `memory/recent_decisions.md`: 최근 주요 결정 사항
- `memory/system_status.md`: 시스템 상태 및 이슈
- `memory/weekly_achievements.md`: 주간 성과 기록

### Reports Archive
- `reports/daily_journals/YYYY-MM-DD_journal.md`
- `reports/weekly_progress/YYYY-MM-DD_weekly.md`
- `reports/monthly_ops/YYYY-MM_operations.md`

## 스케줄링 (Scheduling)

### 일일 실행
- **09:00 UTC**: Daily TODO 발송, Standup 리마인더
- **15:00 UTC**: 태스크 상태 체크
- **21:00 UTC**: Daily Journal 생성

### 주간 실행
- **월요일 09:00 UTC**: 주간 진행 리포트

### 월간 실행
- **매월 1일 09:00 UTC**: 월간 운영 요약

### 실시간
- **매시간**: 시스템 헬스 체크
- **Slack 이벤트**: 멘션, DM 자동 응답

## 에이전트 호출 방법 (How to Invoke)

### Claude Code에서
```bash
# Operations 에이전트와 대화
> "오늘 TODO 보여줘"
> "주간 리포트 생성해줘"
> "overdue 태스크 체크해줘"
> "시스템 상태 확인해줘"
> "팀 standup 결과 요약해줘"
```

### 프로그래밍 방식
```python
from ash_bot.operations import TaskManager, ReportGenerator

# Daily TODO 발송
task_manager = TaskManager()
task_manager.send_daily_todo()

# 주간 리포트 생성
reporter = ReportGenerator()
reporter.generate_weekly_report()
```

## 모니터링 (Monitoring)

### 성공 지표
- ✅ Daily TODO 정상 발송
- ✅ Daily Journal 자동 생성
- ✅ Overdue 태스크 < 5%
- ✅ 시스템 Uptime > 99%
- ✅ 알림 응답률 > 95%

### 주의 지표
- ⚠️ Overdue 태스크 증가
- ⚠️ 시스템 에러 증가
- ⚠️ API 응답 시간 지연
- ⚠️ 자동화 스크립트 실패

## 에이전트 업데이트 로그

### 2026-02-25: 온보딩 챗봇 버그 수정
- app.py: None 체크, KeyError 방어, 페이지네이션, 완료 순서, 레이스 컨디션, action_id 파싱, N+1 쿼리 제거 (총 9건)
- db_manager.py: threading.Lock, INSERT OR IGNORE, 인덱스, get_all_progress() 추가
- 커밋 4개 / push 완료

### 2026-02-11: Operations Agent 초기 설정
- 에이전트 역할 정의
- 워크플로우 설계
- Daily Journal 스크립트 구현 완료 (`scripts/daily_journal.py`)
- Daily TODO 스크립트 구현 완료 (`scripts/send_daily_todo.py`)
- Windows 스케줄러 설정 완료

### 기존 구현 완료
- ✅ Daily Journal 자동화
- ✅ Daily TODO 발송
- ✅ ClickUp 연동
- ✅ Gmail 모니터링 (변호사 이메일)

### 다음 계획
- [ ] 주간 진행 리포트 자동화
- [ ] Slack Standup bot
- [ ] 태스크 에스컬레이션 자동화
- [ ] 시스템 헬스 체크 대시보드
- [ ] Notion 통합 강화

## 문의 및 지원

**담당자**: Seohyun Ahn (Operations Lead)
**프로젝트 시작**: 2026-02-11
**최종 업데이트**: 2026-02-25
