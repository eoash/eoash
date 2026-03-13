# Gowid Slack Bot — 설계서

> Claude(Producer) + Codex(Reviewer) 4라운드 Deliberate 결과. LGTM(조건부) 판정.

---

## 1. 아키텍처

```
┌─────────────────────────────────────────────────┐
│  Mac (launchd)                                   │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐ │
│  │ Poller   │───▶│ Classify │───▶│ Submitter  │ │
│  │(Gowid API)    │(Rules)   │    │(API+Slack) │ │
│  └──────────┘    └──────────┘    └────────────┘ │
│       │               │               │         │
│       ▼               ▼               ▼         │
│  ┌──────────────────────────────────────────┐   │
│  │         SQLite (WAL mode)                │   │
│  │  expenses | audit_log | auto_rules       │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────┐                                   │
│  │ Slack    │◄── Socket Mode (DM + Modal)       │
│  │ Bolt App │                                   │
│  └──────────┘                                   │
└─────────────────────────────────────────────────┘
```

## 2. 기술 스택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 언어 | Python 3.11+ | 기존 ash_bot/scripts 전체가 Python |
| Slack | slack-bolt (Socket Mode) | HTTP endpoint 불필요, 로컬 실행 |
| HTTP | httpx (async) | Gowid API 호출 |
| 스케줄러 | APScheduler 3.x | 프로세스 내장 |
| DB | SQLite (WAL mode) | 30명 규모에 충분, 서버 불필요 |
| 설정 | python-dotenv | 기존 .env 패턴 유지 |

## 3. 자동화 3단계

| 유형 | 예시 | 자동화 수준 |
|------|------|------------|
| 완전 자동 | Airtable, Notion, Zoom 등 구독 | confidence >= 0.95 → 자동 제출 |
| 참석자만 선택 | 식대, 커피 | 용도 자동 추천 + Slack Modal |
| 메모 필수 | 소모품비, 업무추진비 | 결제 직후 Slack 푸시 |

## 4. 상태 머신 (Phase1: 5개 상태)

```
                    ┌──────────┐
          ┌─────── │ rejected │ ◄──── T4
          │ T5     └──────────┘
          │ (재제출)
          ▼
    ┌─────────┐  T1/T2  ┌───────────┐  T3   ┌──────────┐  T6   ┌─────────┐
    │ pending │ ──────▶ │ submitted │ ────▶ │ approved │ ────▶ │ settled │
    └─────────┘         └───────────┘       └──────────┘       └─────────┘
```

### 전이표

| 전이 | From → To | 트리거 | 조건 |
|------|-----------|--------|------|
| T1 | pending → submitted | 사용자 Slack 입력 | 용도 필수 |
| T2 | pending → submitted | 자동 제출 (반복결제) | confidence >= 0.95 |
| T3 | submitted → approved | 관리자 승인 | ADMIN 권한 |
| T4 | submitted → rejected | 관리자 반려 | 사유 필수 |
| T5 | rejected → submitted | 수정 후 재제출 | 용도/메모 변경 |
| T6 | approved → settled | 월말 정산 | DB만 업데이트 |

### 방어 코드

```python
ALLOWED_TRANSITIONS = {
    "pending":   {"submitted"},
    "submitted": {"approved", "rejected"},
    "rejected":  {"submitted"},
    "approved":  {"settled"},
    "settled":   set(),
}
```

## 5. DB 스키마

```sql
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;

CREATE TABLE expenses (
    expense_id    TEXT PRIMARY KEY,
    state         TEXT NOT NULL DEFAULT 'pending',
    expense_type  TEXT,            -- 'auto' | 'need_participants' | 'need_memo' | 'manual'
    merchant      TEXT,
    amount        INTEGER,
    card_holder   TEXT,
    slack_user_id TEXT,
    purpose_id    TEXT,
    purpose_name  TEXT,
    confidence    REAL,
    raw_data      TEXT,            -- Gowid API 원본 JSON
    slack_msg_ts  TEXT,
    retry_count   INTEGER DEFAULT 0,
    detected_at   TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at  TEXT,
    approved_at   TEXT,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id  TEXT NOT NULL,
    action      TEXT NOT NULL,     -- 'state_change' | 'api_call' | 'user_input' | 'manual_override'
    old_state   TEXT,
    new_state   TEXT,
    actor       TEXT NOT NULL,     -- 'system' | 'poller' | slack_user_id | 'admin:ash'
    reason      TEXT,
    detail      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (expense_id) REFERENCES expenses(expense_id)
);

CREATE TABLE auto_rules (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    merchant_pattern TEXT NOT NULL,
    purpose_id      TEXT NOT NULL,
    purpose_name    TEXT NOT NULL,
    amount_min      INTEGER,
    amount_max      INTEGER,
    memo_template   TEXT,
    status          TEXT DEFAULT 'active',  -- 'candidate' | 'active' | 'disabled'
    hit_count       INTEGER DEFAULT 0,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE user_mapping (
    gowid_member_id TEXT PRIMARY KEY,
    gowid_name      TEXT NOT NULL,
    slack_user_id   TEXT NOT NULL,
    is_active       INTEGER DEFAULT 1,
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE submit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id      TEXT NOT NULL,
    action          TEXT NOT NULL,
    idempotency_key TEXT UNIQUE,   -- '{expense_id}:{action}:{value_hash}'
    status          TEXT NOT NULL,  -- 'pending' | 'success' | 'failed' | 'timeout'
    attempted_at    TEXT NOT NULL,
    resolved_at     TEXT,
    detail          TEXT
);

CREATE INDEX idx_expenses_state ON expenses(state);
CREATE INDEX idx_audit_expense ON audit_log(expense_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

## 6. Idempotency — Read-Back 패턴

Gowid API에 자체 idempotency key가 없으므로 제출 전후 GET으로 확인.

```
1. GET /expenses/{id} → 이미 제출됐는지 확인
2. PUT /expenses/{id}/purposes → 제출 시도
3. 타임아웃 시 → 2초 후 GET 재확인 → 성공이면 종료
4. 최대 1회 재시도 (중복 제출 > 미제출 원칙)
```

submit_log에 `{expense_id}:{action}:{value_hash}` UNIQUE로 중복 실행 방지.

## 7. 실패 시나리오 + 복구

| # | Gowid API | 로컬 DB | 복구 |
|---|-----------|---------|------|
| S1 | 성공 | 성공 | 정상 |
| S2 | 성공 | 실패 | Reconciliation에서 자동 보정 |
| S3 | 실패 | 성공 | 구조적 불가 (API-first, DB-second) |
| S4 | 실패 | 실패 | 사용자에게 재시도 요청 |
| S5 | 타임아웃 | — | Read-Back → S1 또는 S4로 분기 |

핵심 원칙: **API-first, DB-second** — API 성공 확인 후에만 DB 업데이트.

## 8. Reconciliation (일 1회)

매일 09:00 자동 실행. Gowid 실제 상태 vs 로컬 DB 비교.

- Gowid가 더 앞선 상태 → 자동 보정
- rejected 관련 → 수동 (관리자 Slack 알림)
- `/reconcile` (전체), `/reconcile-fix {id}` (개별) 수동 명령

## 9. Confidence + 자동제출 안전장치

| 신호 | 점수 |
|------|------|
| 가맹점 정확 일치 | +0.80 |
| 가맹점 패턴 매칭 | +0.60 |
| 금액 범위 일치 | +0.15 |
| 12개월 연속 | +0.05 |

| Confidence | 동작 |
|-----------|------|
| >= 0.95 | 자동 제출 |
| 0.70 ~ 0.94 | 추천 + 확인 버튼 |
| < 0.70 | 수동 입력 |

추가 안전장치:
- rule별 amount_min/max (금액 범위)
- 단건 200만원 상한
- 일일 20건 상한

## 10. 권한 3단계

| Role | 범위 |
|------|------|
| USER | 본인 영수증 |
| ADMIN | 승인/반려/대사 |
| SUPER_ADMIN | 규칙/임계값 변경 |

## 11. 프로젝트 구조

```
gowid-slack-bot/
├── README.md
├── DESIGN.md
├── requirements.txt
├── .env.example
├── src/
│   ├── main.py              # 진입점: Bolt App + Scheduler
│   ├── config.py
│   ├── gowid/
│   │   ├── client.py        # GowidClient (httpx + Read-Back)
│   │   ├── models.py        # Expense, Member dataclass
│   │   └── endpoints.py
│   ├── core/
│   │   ├── poller.py        # 5분 polling + dedup
│   │   ├── classifier.py    # 3-tier + confidence
│   │   ├── auto_submitter.py
│   │   ├── meal_handler.py
│   │   ├── memo_handler.py
│   │   ├── admin_handler.py
│   │   ├── reminder.py
│   │   └── reconciler.py
│   ├── slack/
│   │   ├── app.py           # Bolt App (Socket Mode)
│   │   ├── blocks.py
│   │   ├── modals.py
│   │   └── listeners.py
│   └── db/
│       ├── database.py      # SQLite WAL + optimistic lock
│       ├── migrations.py
│       └── seed.py          # 초기 auto_rules + user_mapping
├── data/
│   └── seed/
│       ├── auto_rules.json
│       └── user_mapping.json
└── tests/
```

## 12. 개발 로드맵

| Phase | 내용 | 기간 |
|-------|------|------|
| 0 | API Key 수령, Swagger 실제 응답 확인 | 대기 중 |
| 1 (MVP) | 폴링 + 분류 + 자동제출 + Slack Modal + audit_log | 2주 |
| 2 | retry + 리마인더 + 일괄 승인 + 일일 리포트 + reconciliation | 2주 |
| 3 | rule 승격 + 수동복구 + 분류기 고도화 + 컨테이너 이전 검토 | 이후 |

## 13. 리뷰 이력

| Round | Agent | 판정 | 핵심 피드백 |
|-------|-------|------|-----------|
| R1 | Codex (GPT-5.4) | NEEDS_REVISION | 상태모델, idempotency, 감사로그, 운영리스크 |
| R2 | Codex (GPT-5.4) | NEEDS_REVISION | 중복제출, API/DB 원자성, reconciliation |
| R4 | Codex (GPT-5.4) | **LGTM (조건부)** | 구현 시 3가지 명문화 필요 |

### 구현 시 반영할 조건 3가지
1. Read-Back 매칭 키 정의 (expenseId + purposeId 조합)
2. submit_log UNIQUE INDEX + INSERT 트랜잭션 경계
3. reconciliation 수동 개입건 Slack 알림 경로
