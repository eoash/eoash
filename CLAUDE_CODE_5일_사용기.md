# Claude Code 5일 사용기: AI와 함께 업무 자동화 시스템 구축하기

**작성자**: Seohyun Ahn (Finance Lead @ EO Studio)
**기간**: 2026-02-08 ~ 2026-02-13 (5일)
**플랫폼**: Windows → Mac 마이그레이션 포함

---

## 🎯 시작 계기

Finance Lead로 일하면서 매일 반복되는 수작업들이 너무 많았습니다:
- 미수금(AR) 추적을 위해 매일 Bill.com과 은행 사이트를 오가며 수동 매칭 (30분/일)
- 변호사/회계사 이메일 모니터링 및 분류
- ClickUp을 활용한 개인 작업 관리 및 투두리스트 정리
- YouTube 썸네일 투표 및 캡션 생성

이 모든 것을 자동화하고 싶었지만, 개발자가 아니었기에 막막했습니다. 그러던 중 **Claude Code**를 접하게 되었고, "AI와 대화하면서 시스템을 만들 수 있다"는 점에 끌려 시작했습니다.

---

## 📊 5일간 만든 것들

### 1. AR Automation System (Phase 1 MVP)
**문제**: US 지역 미수금 추적이 완전 수동 프로세스
- 매일 Bill.com 로그인 → Chase Bank 입금 확인 → 수동 매칭 → Status 업데이트
- 시간 소모 (30분/일) + Human Error 위험

**구현**: 기본 자동화 시스템 (Phase 1 MVP)
```
Daily Scheduler (9:00 UTC)
        ↓
┌─────────────────────────┐
│  ash_bot (Python)       │
├─────────────────────────┤
│ 1. Fetch Bill.com      │
│ 2. Fetch Chase (Plaid) │
│ 3. Match payments      │
│ 4. Update Bill.com     │
│ 5. Generate report     │
│ 6. Send notifications  │
└─────────────────────────┘
        ↓↓↓
    Slack + Notion
```

**핵심 기능**:
- **3단계 지능형 매칭**:
  1. Exact Match (금액 정확히 일치, 신뢰도 100%)
  2. Invoice Number Extraction (결제 설명에서 인보이스 번호 추출, 95%)
  3. Fuzzy Name Match (고객명 유사도 70%+, 50-80%)
- **Dry-run 모드**: 실제 업데이트 전 검증
- **Aging Analysis**: 30일/60일/90일+ 미수금 자동 분류
- **자동 알림**: Overdue invoice를 Slack/Notion으로 전송

**현재 상태**:
- ✅ 핵심 로직 구현 완료
- ✅ Dry-run 테스트 가능
- ⏳ 실제 운영 환경 검증 예정

**목표**:
- 30분/일 → 5분/일로 단축 (83% 시간 절감)
- 자동 매칭률 90%+
- Human Error 최소화

**기술 스택**: Python, Bill.com API, Plaid, Slack, Notion, pytest

---

### 2. 이메일 & 생산성 자동화 시스템

**구현 내용**:
- **Gmail 모니터링**: 특정 발신자(변호사, 회계사) 이메일 자동 추적
- **ClickUp 연동**: 이메일과 ClickUp을 연동하여 작업 관리 효율화
- **개인 작업 관리**: 일일 작업 조회 및 우선순위 정렬
- **일일 저널 자동화**: Obsidian 저널 자동 생성 및 Google Drive 동기화

**스크립트들**:
```
scripts/
├── daily_journal.py           # 일일 저널 생성
├── send_daily_todo.py         # 개인 투두 관리
├── check_lawyer_emails.py     # 변호사 이메일 모니터링
├── add_task.py / move_task.py # ClickUp 작업 관리
└── setup_scheduler.bat/ps1    # Windows 스케줄러 설정
```

**기대 효과**:
- 이메일 확인 시간 단축
- 개인 작업 관리 효율성 향상
- 저널 작성 자동화로 회고 품질 향상

---

### 3. Slack 봇 시스템

#### A. YouTube 썸네일 캡션 생성 에이전트
**문제**: 썸네일 투표 후 캡션을 수동으로 작성해야 함

**해결**:
- Slack에서 썸네일 투표 진행
- 투표 완료 시 Claude API로 자동 캡션 생성
- 투표 이력 및 캡션을 파일로 저장

**핵심 로직**:
```python
ash_bot/core/
├── thumbnail_agent.py      # Claude API 연동
├── vote_tracker.py         # 투표 추적
└── thumbnail_evaluator.py  # 썸네일 평가
```

#### B. Slack DM 시스템
- 이메일로 Slack 사용자 조회
- 우선순위별 이모지 표시 (🔴 High, 🟡 Medium)
- Task URL 자동 링크

**결과**:
- ✅ 썸네일 워크플로우 자동화 구현
- ✅ 팀 커뮤니케이션 효율성 개선

---

### 4. 법인 운영 문서화

5일간 작성한 문서들 (30+ 파일):

**투자 & 법인**:
- `us_corporate_documents_summary.md` - 미국 법인 문서 요약
- `valuation_summary.md` - 밸류에이션 정리
- `shareholder_list_organized.md` - 주주 명부
- `signature_packet_distribution.md` - 서명 패킷 배포 가이드
- `investor_response_guide.md` - 투자자 응대 가이드

**프로젝트 & 이메일**:
- `flip_background_and_context.md` - FLIP 프로젝트 배경
- `flip_email_log.md` - FLIP 이메일 기록
- `email_distribution_guide.md` - 이메일 배포 가이드
- `글로벌_협력_네트워크.md` - 글로벌 파트너십 현황

**개발 & 아키텍처**:
- `ALEX_CODE_REVIEW.md` - 코드 리뷰 결과
- `IMPLEMENTATION_SUMMARY.md` - 구현 요약
- `docs/slack_bot_setup.md` - Slack 봇 설정 가이드

**결과**:
- ✅ 운영 지식 체계화
- ✅ 팀 온보딩 시간 단축
- ✅ 법인 문서 중앙화

---

### 5. 개발 인프라 구축

#### A. Windows → Mac 마이그레이션
**문제**: Claude Code를 Windows에서 시작했지만 Mac으로 전환 필요

**해결**:
- 자동 백업 스크립트 (`backup_for_mac.bat`)
- Mac 복원 스크립트 (`restore_on_mac.sh`)
- 민감 정보 보안 처리 (`.env`, credentials 분리)

**마이그레이션 대상**:
```
✓ Claude Code 설정 (settings.json)
✓ Auto Memory (MEMORY.md)
✓ Credentials (.env, credentials.json, token.json)
✓ 대화 히스토리 (history.jsonl)
✓ Git 저장소 전체
```

#### B. 클린 아키텍처 & 코드 리뷰 프로세스
**도입한 원칙**:
- Clean Architecture (레이어 분리)
- Dependency Injection 패턴
- SOLID 원칙
- 커밋 전 필수 코드 리뷰

**구조**:
```
Presentation (Scripts/CLI)
    ↓
Application (Use Cases)
    ↓
Domain (Business Logic)
    ↓
Infrastructure (API Clients)
```

**Senior Architect 페르소나 (Alex Kim)**:
- 모든 코드를 리뷰하는 가상의 시니어 아키텍트
- SOLID 원칙 위반 체크
- 테스트 가능성 검증

**결과**:
- ✅ 코드 품질 향상
- ✅ 테스트 가능한 구조
- ✅ 유지보수성 향상

---

## 🛠️ 사용한 기술 스택

### 언어 & 프레임워크
- Python 3.10+
- pytest (테스팅)

### 통합 서비스
- **금융**: Bill.com API, Plaid (Chase Bank)
- **커뮤니케이션**: Slack, Gmail
- **생산성**: Notion, ClickUp
- **AI**: Claude API (Sonnet 4.5)

### 아키텍처
- Clean Architecture
- Dependency Injection
- Type Hints (완전 타입 안전)

---

## 🎓 주요 배운 점

### 1. Claude Code는 "대화형 개발 환경"이다
처음에는 "AI가 코드를 대신 써주는 도구"라고 생각했습니다. 하지만 실제로는:
- **설계 파트너**: "이 아키텍처가 확장 가능할까요?"
- **코드 리뷰어**: "이 함수가 SRP를 위반하나요?"
- **디버거**: "왜 이 API 호출이 실패하나요?"
- **문서 작성자**: "이 시스템을 어떻게 설명해야 할까요?"

→ **단순 코딩 도구가 아니라 페어 프로그래밍 파트너**였습니다.

### 2. 클린 아키텍처의 중요성
**초기 실수**:
```python
# Bad: 모든 로직이 한 파일에 섞여 있음
def run_daily():
    # Bill.com API 호출
    # Plaid API 호출
    # 매칭 로직
    # Slack 전송
    # 200줄...
```

**개선 후**:
```python
# Good: 레이어 분리
class PaymentMatcher:  # Domain
    def match(self, payments, invoices) -> List[Match]:
        ...

class ARReporter:  # Application
    def __init__(self, matcher: PaymentMatcher):
        self.matcher = matcher
    ...
```

→ **테스트 가능성과 유지보수성이 극적으로 향상**

### 3. Dependency Injection의 힘
**문제**:
```python
# Bad: 하드코딩된 의존성
class PaymentMatcher:
    def __init__(self):
        self.billcom = BillComClient()  # 테스트 불가능
```

**해결**:
```python
# Good: 의존성 주입
class PaymentMatcher:
    def __init__(self, billcom_client: BillComClient):
        self.billcom = billcom_client  # Mock 가능

# 테스트 시
matcher = PaymentMatcher(MockBillComClient())
```

→ **유연성과 테스트 가능성 확보**

### 4. 보안은 사전 예방이 필수
**실수할 뻔한 것**:
- Credentials를 Git에 올릴 뻔함
- API keys를 로그에 출력할 뻔함

**해결**:
- `.gitignore` 철저히 관리
- `.env` 파일로 환경 변수 분리
- `.env.example`로 템플릿 제공
- 민감 정보는 절대 로그에 출력 금지

→ **보안은 한 번 실수하면 복구 불가능, 처음부터 올바르게**

### 5. 자동화의 잠재적 가치
**투자**: 5일 (약 40시간)

**예상 절감 효과** (시스템 안정화 후):
- AR 추적: 25분/일 절감 → **연간 약 150시간**
- 이메일 모니터링: 15분/일 절감 → **연간 약 90시간**
- 투두 전송: 10분/일 절감 → **연간 약 60시간**
- **총 300시간/년 절감 예상** (약 7.5주)

→ **초기 투자 대비 높은 잠재적 수익**

### 6. 문서화는 미래를 위한 투자
**작성한 문서들**:
- `CLAUDE.md` - 프로젝트 가이드라인
- `README.md` - 시작 가이드
- `WORK_SUMMARY.md` - 작업 요약
- `migration_to_mac.md` - 마이그레이션 가이드
- 30+ 운영 문서들

→ **6개월 후 다시 봐도 컨텍스트 손실 없음**

### 7. Git은 단순 버전 관리 이상이다
**활용 방법**:
- 원자적 커밋으로 변경 추적
- `Co-Authored-By: Claude Sonnet 4.5`로 협업 명시
- 커밋 메시지로 의사결정 기록
- 브랜치로 실험적 기능 격리

→ **프로젝트 히스토리가 곧 학습 기록**

---

## 🚧 현재 상태 & 다음 단계

### ✅ 구현 완료
- AR Automation System Phase 1 MVP (운영 검증 예정)
- 이메일 & 투두 자동화 스크립트
- Slack 봇 시스템 (썸네일 에이전트, DM 시스템)
- 법인 운영 문서화 (30+ 파일)
- Windows → Mac 마이그레이션 시스템
- 클린 아키텍처 구축

### 🔄 진행 중
- Mac 환경에서 스케줄러 설정 (cron)
- Phase 1 시스템 운영 검증 및 안정화
- 매칭 정확도 튜닝 및 실제 데이터 검증

### ⏸️ Phase 2 계획 (1-3개월)
- [ ] Hanmi Bank 통합
- [ ] Manual override 기능 (수동 조정)
- [ ] Duplicate payment detection
- [ ] ML 기반 매칭 정확도 향상
- [ ] Auto-generated follow-up emails
- [ ] Revenue forecasting

---

## 💡 Claude Code를 추천하는 이유

### 1. **비개발자도 시스템을 만들 수 있다**
저는 Finance 출신으로 Python을 거의 몰랐습니다. 하지만:
- "Bill.com API를 Python으로 어떻게 호출하나요?"
- "이 에러가 왜 나나요?"
- "Dependency Injection이 뭔가요?"

이런 질문을 하며 배웠고, 5일 만에 작동하는 MVP 시스템을 구축했습니다.

### 2. **Best Practices를 자연스럽게 배운다**
Claude Code는 단순히 "작동하는 코드"가 아니라:
- Type hints 추가
- SOLID 원칙 준수
- 테스트 가능한 구조
- 의미있는 변수명

이런 것들을 자연스럽게 제안하고 설명해줍니다.

### 3. **문서화를 강제한다**
"이 코드를 README에 어떻게 설명할까요?" 같은 질문을 통해:
- 코드를 다시 생각하게 됨
- 더 명확한 구조로 개선
- 문서가 자연스럽게 축적

### 4. **실수를 사전에 방지한다**
- "이 credentials를 Git에 올리면 안 됩니다"
- "이 함수가 너무 길어서 테스트하기 어렵습니다"
- "이 의존성이 순환 참조를 만듭니다"

→ **실수하기 전에 경고**

### 5. **지속적인 학습 파트너**
단순히 답을 주는 게 아니라:
- "왜 이렇게 해야 하나요?" → 원리 설명
- "다른 방법은 없나요?" → 대안 제시
- "이게 최선인가요?" → 트레이드오프 분석

---

## 🎯 이 글을 읽는 당신에게

### "나는 개발자가 아닌데..." → 괜찮습니다
저도 Finance 출신입니다. Claude Code와 대화하며 배웠습니다.

### "시간이 너무 오래 걸릴 것 같은데..." → 5일이면 충분합니다
Phase 1 MVP를 만드는 데 5일이 걸렸습니다. 완벽하지는 않지만, 작동하는 시스템을 만들 수 있었습니다.

### "내 업무는 너무 특수해서..." → 오히려 좋습니다
Bill.com + Plaid 같은 특수한 API 통합도 가능했습니다. 당신의 업무는 더 쉬울 수 있습니다.

### "나중에 유지보수할 수 있을까..." → 문서화하면 됩니다
Claude Code와 함께 문서를 작성하면, 6개월 후에도 이해할 수 있습니다.

---

## 📊 숫자로 보는 5일

| 항목 | 수치 |
|------|------|
| 작성한 Python 코드 | ~7,000 lines |
| 작성한 문서 | 30+ 파일 |
| 통합한 외부 서비스 | 8개 (Bill.com, Plaid, Slack, Notion, ClickUp, Gmail, Claude API, Google Drive) |
| Git 커밋 | 10개 |
| 예상 일일 시간 절감 | 50분 (시스템 안정화 후) |
| 예상 연간 시간 절감 | 300시간 (7.5주) |
| 투자 대비 잠재적 가치 | 높음 (장기적 관점) |

---

## 🔗 관련 자료

- **GitHub 저장소**: [eoash/eoash](https://github.com/eoash/eoash)
- **Claude Code**: [claude.ai/claude-code](https://claude.ai/claude-code)
- **프로젝트 문서**: `CLAUDE.md`, `README.md`, `WORK_SUMMARY.md`

---

## 마무리하며

5일 전 저는 "AI가 코드를 대신 써준다"고 생각했습니다.
지금은 "AI와 함께 시스템을 설계하고 구축한다"는 것을 알게 되었습니다.

Claude Code는 단순한 도구가 아니라 **학습 파트너, 설계 동료, 코드 리뷰어**입니다.

**당신도 할 수 있습니다.**
질문하고, 대화하고, 배우면서 만들어보세요.

완벽하지 않아도 괜찮습니다. 5일 만에 작동하는 것을 만드는 것이 중요합니다.
개선은 그 다음입니다.

---

**문서 작성일**: 2026-02-13
**작성자**: Seohyun Ahn with Claude Sonnet 4.5
**Co-Authored-By**: Claude Sonnet 4.5 <noreply@anthropic.com>
