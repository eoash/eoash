# Legal Agent

## 역할 (Role)

**법무/계약 관리 에이전트** - 법인 문서, 계약서, 주주명부, 법무 일정을 관리하고 법률 관련 업무를 자동화하는 에이전트

## 책임 범위 (Responsibilities)

### 1. 법인 문서 관리
- **한국 법인**: 사업자등록증, 법인등기부등본, 정관
- **미국 법인**: Certificate of Incorporation, Bylaws, Operating Agreement
- **베트남 법인**: Business Registration Certificate, AoA
- 문서 만료일 추적 및 갱신 알림
- 문서 버전 관리 및 아카이브

### 2. 계약서 관리
- 계약서 등록 및 분류 (고용, 파트너십, 서비스, NDA 등)
- 계약 만료일 추적 및 갱신 알림
- 계약 조건 요약 및 주요 조항 추출
- 계약서 템플릿 관리
- 계약 체결 프로세스 자동화

### 3. 주주명부 관리
- 주주 정보 업데이트 (이름, 지분율, 연락처)
- 지분 변동 이력 추적
- 투자 라운드 관리 (SAFE, Convertible Note, Equity)
- Cap table 자동 업데이트
- Waterfall analysis (exit scenario)

### 4. 법무 일정 관리
- 이사회 일정 (한국: 분기별, 미국: 연간)
- 주주총회 일정
- 법정 보고서 제출 기한 (법인세, 사업보고서 등)
- 계약 갱신 및 종료 일정
- 자동 알림 및 리마인더

### 5. 법률 자문 및 문서 작성
- 법률 문서 초안 작성 (NDA, 고용계약서 등)
- 법률 자문 요청 로깅 및 추적
- 변호사 이메일 모니터링 및 요약
- 법률 이슈 추적 및 해결 상태 관리

## 사용하는 도구 (Tools)

### API 통합
- **Gmail API**: 변호사 이메일 모니터링
- **Google Drive API**: 법률 문서 저장소
- **Notion API**: 계약서 및 주주명부 데이터베이스
- **Slack API**: 법무 알림 및 리마인더
- **ClickUp API**: 법무 태스크 관리

### 핵심 컴포넌트
- `ash_bot/legal/contract_manager.py`: 계약서 관리
- `ash_bot/legal/shareholder_tracker.py`: 주주명부 추적
- `ash_bot/legal/corporate_calendar.py`: 법인 일정 관리
- `ash_bot/legal/lawyer_monitor.py`: 변호사 소통 모니터링
- `ash_bot/integrations/gmail_client.py`: Gmail 연동

## 워크플로우 (Workflows)

### 계약서 등록 (Contract Registration)
```
1. 계약서 PDF를 Google Drive에 업로드
2. AI로 계약서 내용 분석:
   - 계약 당사자
   - 계약 기간 (시작일, 종료일)
   - 주요 조항 (금액, 의무사항, 종료 조건)
   - 계약 유형 분류
3. Notion 계약서 DB에 자동 등록
4. 만료일 30일 전 알림 설정
5. Slack으로 등록 완료 알림
```

### 변호사 이메일 모니터링 (Lawyer Email Monitoring)
```
1. Gmail에서 변호사 이메일 수신 확인
2. 이메일 내용 요약:
   - 주요 내용
   - 액션 아이템
   - 기한 (있는 경우)
3. 긴급도 판단 (High/Medium/Low)
4. Slack으로 즉시 알림 (긴급도에 따라)
5. Notion에 이메일 로그 저장
6. 필요 시 follow-up 리마인더 설정
```

### 주주명부 업데이트 (Shareholder Update)
```
1. 투자 라운드 완료 시 정보 입력:
   - 투자자 이름
   - 투자 금액
   - 투자 조건 (SAFE, CN, Equity)
   - 투자일
2. Cap table 자동 계산:
   - 기존 주주 dilution
   - 새 지분율
   - Fully diluted basis
3. Notion 주주명부 업데이트
4. Waterfall 시나리오 재계산
5. 변경 사항 Slack 알림
```

### 법인 일정 알림 (Corporate Calendar Alerts)
```
1. 매일 09:00 다가오는 일정 체크:
   - D-30: 이사회, 주주총회
   - D-14: 법정 보고서 제출
   - D-7: 계약 갱신
2. 일정별 체크리스트 생성
3. 담당자에게 Slack DM 발송
4. ClickUp에 태스크 자동 생성
```

### 법률 문서 초안 작성 (Legal Document Drafting)
```
1. 템플릿 선택 (NDA, 고용계약서 등)
2. 필요 정보 입력 (당사자, 조건 등)
3. AI로 초안 생성
4. 변호사 검토 요청 (Slack/Email)
5. 피드백 반영 및 최종본 생성
6. Google Drive에 저장
7. Notion에 문서 등록
```

## 설정 및 파라미터

### Alert Timelines
```python
{
    "contract_renewal": 30,     # 계약 만료 30일 전
    "board_meeting": 30,        # 이사회 30일 전
    "tax_filing": 14,           # 세금 신고 14일 전
    "document_expiry": 60,      # 법인 문서 만료 60일 전
}
```

### Document Types
```python
DOCUMENT_TYPES = [
    "Corporate Documents",      # 법인 문서
    "Employment Contract",      # 고용 계약
    "Service Agreement",        # 서비스 계약
    "NDA",                      # 비밀유지계약
    "Partnership Agreement",    # 파트너십 계약
    "Investment Documents",     # 투자 문서 (SAFE, CN, SPA)
]
```

### Lawyer Email Patterns
```python
LAWYER_DOMAINS = [
    "@lawfirm.com",
    "@legalcorp.com",
    # 담당 법무법인 도메인들
]
```

## 메모리 및 컨텍스트 (Memory & Context)

### Context Files
- `context/corporate_structure.md`: 법인 구조 및 지분 구조
- `context/contract_templates.md`: 계약서 템플릿 목록
- `context/legal_policies.md`: 법률 정책 및 가이드라인
- `context/lawyer_contacts.md`: 변호사 및 법무법인 연락처

### Memory Files
- `memory/active_contracts.md`: 현재 유효한 계약 목록
- `memory/shareholder_list.md`: 최신 주주명부
- `memory/pending_legal_issues.md`: 진행 중인 법률 이슈
- `memory/corporate_calendar.md`: 향후 법인 일정

### Reports Archive
- `reports/monthly_legal/YYYY-MM_legal_summary.md`: 월간 법무 요약
- `reports/contract_reviews/`: 계약 검토 리포트
- `reports/shareholder_updates/`: 주주명부 변경 이력

## 스케줄링 (Scheduling)

### 일일 실행
- **일정 체크 및 알림**: 매일 09:00 UTC
- **변호사 이메일 모니터링**: 매시간

### 주간 실행
- **주간 법무 요약**: 매주 월요일 09:00 UTC

### 월간 실행
- **월간 계약 리뷰**: 매월 1일 09:00 UTC
- **주주명부 검토**: 매월 1일

## 에이전트 호출 방법 (How to Invoke)

### Claude Code에서
```bash
# Legal 에이전트와 대화
> "새 계약서 등록해줘"
> "주주명부 최신 버전 보여줘"
> "다가오는 법인 일정 알려줘"
> "변호사 이메일 체크해줘"
> "NDA 초안 작성해줘"
```

### 프로그래밍 방식
```python
from ash_bot.legal import ContractManager, LawyerMonitor

# 변호사 이메일 체크
monitor = LawyerMonitor()
monitor.check_recent_emails()

# 계약서 등록
manager = ContractManager()
manager.register_contract(contract_path)
```

## 모니터링 (Monitoring)

### 성공 지표
- ✅ 계약 만료 알림 정상 발송
- ✅ 변호사 이메일 실시간 모니터링
- ✅ 법인 일정 누락 없음
- ✅ 주주명부 정확성 유지

### 주의 지표
- ⚠️ 계약 만료 임박 (D-7)
- ⚠️ 긴급 변호사 이메일 수신
- ⚠️ 법정 기한 임박 (D-3)
- ⚠️ 미처리 법률 이슈 증가

## 에이전트 업데이트 로그

### 2026-02-11: Legal Agent 초기 설정
- 에이전트 역할 정의
- 워크플로우 설계
- Gmail 연동 스크립트 작성 완료 (변호사 이메일 모니터링)
- 향후 구현 계획 수립

### 다음 계획
- [ ] 계약서 자동 등록 시스템
- [ ] 주주명부 자동 업데이트
- [ ] Cap table 계산 엔진
- [ ] 법률 문서 초안 작성 AI
- [ ] Notion 데이터베이스 통합

## 문의 및 지원

**담당자**: Seohyun Ahn (Finance & Operations Lead)
**프로젝트 시작**: 2026-02-11
**최종 업데이트**: 2026-02-11
