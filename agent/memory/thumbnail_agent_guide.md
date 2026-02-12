# YouTube 썸네일 캡션 생성 에이전트 가이드

**생성일**: 2026-02-12
**상태**: MVP Ready for Testing
**작성자**: Claude Code

---

## 📋 개요

EO Studio의 YouTube 썸네일 캡션을 자동으로 생성하고 평가하는 AI 에이전트입니다.

**기능:**
- Claude API를 사용한 18개 캡션 자동 생성
- 팀 스타일 가이드 기반 평가 (CTR, 명확성, 브랜드 일관성)
- Slack 통합 (커맨드 및 결과 공유)
- 히스토리 저장 및 분석

**특징:**
- ✅ 팀의 실제 대화 분석으로 학습
- ✅ 금지 표현 자동 필터링
- ✅ 투표 기반 팀 협업
- ✅ JSON으로 결과 저장

---

## 🚀 설정 방법

### 1. 의존성 설치

```bash
cd /Users/ash/Documents/eoash
pip install -r requirements.txt
```

필수 라이브러리:
- `anthropic` - Claude API
- `slack-sdk`, `slack-bolt` - Slack 통합
- `flask` - Slack 이벤트 서버
- `python-dotenv` - 환경 변수 관리

### 2. API 키 설정

`.env` 파일 업데이트:

```env
# Claude API (필수)
ANTHROPIC_API_KEY=sk_your_api_key_here

# Slack Bot (선택 - Slack 통합용)
SLACK_BOT_TOKEN=xoxb-...  # 이미 설정됨
SLACK_SIGNING_SECRET=your_signing_secret_here

# Notion (선택 - 결과 저장용)
NOTION_THUMBNAIL_DATABASE_ID=your_database_id
```

**Claude API 키 획득:**
1. https://console.anthropic.com 방문
2. API 키 생성
3. `.env`에 추가

### 3. Slack 설정 (선택사항)

**Slack 봇이 `/thumbnail` 커맨드를 인식하도록:**

1. [api.slack.com/apps](https://api.slack.com/apps)에서 앱 설정
2. "Slash Commands" → "Create New Command"
3. Command: `/thumbnail`
4. Request URL: `https://your-domain.com/slack/events`
5. 필요한 scopes:
   - `commands`
   - `chat:write`
   - `channels:history` (이미 추가됨)

---

## 💻 사용 방법

### 방법 1: 로컬 테스트 (권장)

**대화식 모드:**
```bash
python scripts/test_thumbnail_agent.py
```

**예시 입력:**
```
1. 영상 제목: ChatGPT 99% 활용법 | 모르면 손해
2. 키워드 (쉼표로 구분): ChatGPT, 프롬프트, AI, 생산성, 자동화
3. 타겟 오디언스: 직장인, 창업가, 개발자
4. YouTube URL (선택사항): https://youtube.com/...
```

**커맨드라인 모드:**
```bash
python scripts/test_thumbnail_agent.py \
  --title "ChatGPT 99% 활용법" \
  --keywords "ChatGPT,프롬프트,AI" \
  --audience "직장인,창업가"
```

**배치 모드 (여러 요청):**

`input.json` 파일 생성:
```json
[
  {
    "video_title": "ChatGPT 99% 활용법",
    "keywords": ["ChatGPT", "프롬프트", "AI"],
    "target_audience": "직장인, 창업가"
  },
  {
    "video_title": "Notion으로 하루를 관리하기",
    "keywords": ["Notion", "생산성", "자동화"],
    "target_audience": "프리랜서, 학생"
  }
]
```

실행:
```bash
python scripts/test_thumbnail_agent.py --batch input.json
```

### 방법 2: Slack 커맨드 (프로덕션)

**Slack에서:**
```
/thumbnail ChatGPT 99% 활용법 | ChatGPT,프롬프트,AI | 직장인,창업가 | https://youtube.com/...
```

형식:
```
/thumbnail 영상제목 | 키워드1,키워드2,... | 타겟오디언스 | [선택] YouTube URL
```

**결과:**
- 채널에 상위 5개 캡션 포스팅
- 각 캡션의 점수와 피드백 표시
- 👍 버튼으로 팀이 선택 가능

### 방법 3: Python 코드에서 직접

```python
from ash_bot.core.thumbnail_agent import ThumbnailAgent

agent = ThumbnailAgent()

result = agent.generate_captions(
    video_title="ChatGPT 99% 활용법",
    keywords=["ChatGPT", "프롬프트", "AI"],
    target_audience="직장인, 창업가",
    created_by="user@example.com"
)

# 결과 접근
print(f"총 생성: {len(result.generated_captions)}개")
print("상위 5개:")
for i, caption in enumerate(result.top_5, 1):
    print(f"{i}. {caption['caption']} (점수: {caption['overall_score']:.1f})")
```

---

## 📊 평가 기준

각 캡션은 3개 지표로 평가됩니다:

### 1. CTR 잠재력 (40% 가중치)
클릭할 가능성이 높은가?
- ✅ 직접 호소 (+10점)
- ✅ 구체적 숫자 (+15점)
- ✅ 질문형 (+10점)
- ❌ 금지 표현 (-30점)

### 2. 명확성 (30% 가중치)
5초 안에 이해되는가?
- ✅ 최적 길이 15-80자 (+20점)
- ✅ 구체적 단어 (+15점)
- ✅ 행동 동사 (+10점)
- ❌ 너무 길거나 복잡 (-10점)

### 3. 브랜드 일관성 (30% 가중치)
팀 톤과 맞는가?
- ✅ 직접 호소형 (+15점)
- ✅ 질문형 (+10점)
- ✅ 선호 숫자 사용 (+15점)
- ❌ 금지 표현 (-30점)

**종합 점수** = (CTR × 0.4) + (명확성 × 0.3) + (브랜드 × 0.3)

---

## 📁 출력 형식

### 로컬 결과 저장

생성된 캡션은 여기에 저장됩니다:
```
agent/memory/captions/captions_YYYYMMDD_HHMMSS.json
```

**JSON 구조:**
```json
{
  "request": {
    "video_title": "...",
    "keywords": [...],
    "target_audience": "...",
    "created_by": "...",
    "timestamp": "2026-02-12T10:30:00"
  },
  "generated_captions": [
    "캡션 1",
    "캡션 2",
    ...
  ],
  "scored_captions": [
    {
      "caption": "...",
      "ctr_potential": 75.5,
      "clarity": 82.0,
      "brand_alignment": 88.5,
      "overall_score": 82.3,
      "feedback": "✅ CTR 잠재력 높음 | ✅ 팀 톤과 완벽히 일치"
    }
  ],
  "top_5": [
    // 상위 5개만 (위와 동일 형식)
  ],
  "timestamp": "2026-02-12T10:30:45",
  "model_used": "claude-opus-4-6"
}
```

### Slack 메시지 형식

```
🎬 YouTube 썸네일 캡션 제안

영상 제목: ChatGPT 99% 활용법
타겟 오디언스: 직장인, 창업가

옵션 1 (점수: 85.3)
"당신은 ChatGPT의 극히 일부분만 쓰고 있습니다"
✅ CTR 잠재력 높음 | ✅ 팀 톤과 완벽히 일치
[👍 선택]

옵션 2 (점수: 82.1)
...

총 18개 캡션 생성됨 | 팀 스타일 가이드 기반 평가
```

---

## 🔍 팀 스타일 가이드

가이드 파일: `agent/memory/thumbnail_team_style_guide.md`

**주요 내용:**
- 팀이 선호하는 카피 패턴 3가지
- 권장 숫자 표현 (5가지, 10배, 3단계)
- 금지 표현 (금쪽이, 가스라이팅, Stanford)
- 팀원별 피드백 스타일
- 성공 지표

**업데이트 방법:**
1. Slack #request-썸네일 채널 대화 추가 분석
2. 새로운 성공 패턴 발견 시 가이드 업데이트
3. `thumbnail_agent.py`에 반영

---

## 🧪 테스트 예시

### 예시 1: AI 활용법

```bash
python scripts/test_thumbnail_agent.py \
  --title "ChatGPT로 월급 2배 버는 법" \
  --keywords "ChatGPT,AI,생산성,자동화" \
  --audience "직장인,프리랜서"
```

**예상 결과:**
```
옵션 1: "당신의 AI는 극히 일부분만 쓰고 있습니다" (85점)
옵션 2: "왜 내 ChatGPT는 동문서답을 할까?" (83점)
옵션 3: "ChatGPT 답변 100% 못 믿겠다면 지금 당장 해야 할 5가지" (81점)
```

### 예시 2: Notion 강의

```bash
python scripts/test_thumbnail_agent.py \
  --title "Notion으로 3배 빠르게 일하기" \
  --keywords "Notion,생산성,자동화,데이터베이스" \
  --audience "학생,직장인"
```

**예상 결과:**
```
옵션 1: "당신의 Notion은 그저 노트일 뿐입니다" (84점)
옵션 2: "Notion 기능 99% 몰라도 이 4가지만 알면 됩니다" (82점)
```

---

## 🔧 구조

### 핵심 모듈

**1. ClaudeClient** (`ash_bot/integrations/claude_client.py`)
- Claude API와 통신
- 프롬프트 생성
- 응답 파싱

**2. ThumbnailEvaluator** (`ash_bot/core/thumbnail_evaluator.py`)
- 캡션 채점
- 피드백 생성
- 패턴 분석

**3. ThumbnailAgent** (`ash_bot/core/thumbnail_agent.py`)
- 생성 및 평가 오케스트레이션
- 결과 저장
- Slack 형식 변환

**4. Slack Handler** (`scripts/slack_thumbnail_handler.py`)
- 커맨드 처리
- 이벤트 리스닝
- 결과 포스팅

### 의존성 흐름

```
[사용자 요청]
    ↓
ThumbnailAgent
    ├→ ClaudeClient.generate_captions()
    │   └→ Claude API
    ├→ ThumbnailEvaluator.evaluate()
    │   └→ 패턴 분석
    └→ 결과 저장 & Slack 포맷팅
```

---

## ⚙️ 설정 커스터마이제이션

### 생성 개수 변경

`ash_bot/config.py`:
```python
class ThumbnailConfig:
    CAPTION_COUNT = 18  # 변경 가능
```

### 평가 가중치 조정

`ash_bot/core/thumbnail_evaluator.py`:
```python
# 가중치 조정 (현재: CTR 40%, 명확성 30%, 브랜드 30%)
score.overall_score = (
    score.ctr_potential * 0.4 +
    score.clarity * 0.3 +
    score.brand_alignment * 0.3
)
```

### 금지 표현 추가

`ash_bot/core/thumbnail_evaluator.py`:
```python
BANNED_EXPRESSIONS = [
    "금쪽이",
    "가스라이팅",
    # 새 표현 추가
]
```

---

## 🐛 문제 해결

### 문제 1: "Claude API key not configured"

**해결:**
1. `.env` 파일 확인
2. `ANTHROPIC_API_KEY` 값 확인
3. API 키 다시 설정

### 문제 2: 캡션이 너무 짧음/길음

**해결:**
- `config.py`에서 `MIN/MAX_CAPTION_LENGTH` 조정
- Claude 프롬프트 길이 지정 수정

### 문제 3: Slack 연동 오류

**해결:**
1. 봇이 채널에 초대되었는지 확인
2. `SLACK_BOT_TOKEN` 유효성 확인
3. 권한 범위 확인 (chat:write, channels:history)

### 문제 4: 평가 점수가 낮음

**해결:**
1. 스타일 가이드 업데이트
2. 평가 로직 조정
3. 프롬프트 개선

---

## 📈 다음 단계

### Phase 2: 고도화

- [ ] **Notion 통합**: 결과를 Notion 데이터베이스에 자동 저장
- [ ] **Analytics**: 팀 선택 데이터로 모델 학습
- [ ] **YouTube API**: 실제 CTR 추적
- [ ] **A/B Testing**: 썸네일 성능 자동 분석
- [ ] **스케줄링**: 주기적 자동 생성

### Phase 3: 팀 협업

- [ ] **Multi-language**: 영어/베트남어 지원
- [ ] **Custom Personas**: 팀원별 스타일 학습
- [ ] **Version Control**: 캡션 변경 히스토리
- [ ] **Feedback Loop**: 팀 선택으로 모델 자동 개선

---

## 📞 문의

- **담당자**: Seohyun Ahn (Finance Lead)
- **개발**: Claude Code (AI)
- **프로젝트**: EO Studio YouTube Automation

---

**문서 생성**: 2026-02-12
**마지막 업데이트**: 2026-02-12
**상태**: MVP Ready ✅
