# Slack /thumbnail 커맨드 설정 가이드

**상태**: 준비 완료 ✅

---

## 📋 체크리스트

### ✅ 이미 준비된 것
- [x] Slack Bot Token: `xoxb-370817909334-10463649958069-m4V5VLbFvySRTjfiGBPJ8VVK`
- [x] Claude API Key: 설정 완료
- [x] Flask 앱: `scripts/slack_thumbnail_handler.py`
- [x] ngrok 설치: `brew install ngrok`

### 📝 필요한 것 (Slack 앱 설정)

1. **Slack 앱 페이지에서 Signing Secret 복사**
   - https://api.slack.com/apps
   - "EO Studio" 앱 클릭
   - "Basic Information" 탭
   - "Signing Secret" 복사
   - 아래에서 `SLACK_SIGNING_SECRET=...` 로 업데이트

2. **Slash Command 설정**
   - "Slash Commands" → "Create New Command"
   - Command: `/thumbnail`
   - Request URL: (ngrok 시작 후 생성)
   - Short Description: `YouTube 썸네일 캡션 생성`

---

## 🚀 실행 순서

### 1️⃣ .env 파일 업데이트

```bash
# Slack Signing Secret 추가
nano /Users/ash/Documents/eoash/.env

# 이 라인 찾기:
SLACK_SIGNING_SECRET=abc123

# 다음으로 변경:
SLACK_SIGNING_SECRET=your_actual_signing_secret_from_slack
```

**Signing Secret 찾는 방법:**
1. https://api.slack.com/apps
2. "EO Studio" 앱 선택
3. "Basic Information" 탭
4. "Signing Secret" 섹션에서 "Show" 클릭
5. 복사

---

### 2️⃣ ngrok 설치 확인

```bash
ngrok version
```

없으면:
```bash
brew install ngrok
```

---

### 3️⃣ 2개 터미널에서 동시 실행

**터미널 1 - Flask 서버:**
```bash
cd /Users/ash/Documents/eoash
/Users/ash/Documents/eoash/venv/bin/python scripts/slack_thumbnail_handler.py
```

출력:
```
 * Running on http://0.0.0.0:3000
```

**터미널 2 - ngrok 터널:**
```bash
ngrok http 3000
```

출력:
```
Forwarding  https://abc123def456.ngrok.io -> http://localhost:3000
```

---

### 4️⃣ Slack 앱 설정 업데이트

**ngrok URL 복사 후:**

1. https://api.slack.com/apps
2. "EO Studio" 앱 클릭
3. "Slash Commands" 클릭
4. `/thumbnail` 커맨드 클릭
5. "Request URL" 수정:
   ```
   https://abc123def456.ngrok.io/slack/events
   ```
6. "Save" 클릭

---

### 5️⃣ Slack에서 테스트

원하는 Slack 채널에서:

```
/thumbnail ChatGPT 99% 활용법 | ChatGPT,프롬프트,AI | 직장인,창업가
```

**형식:**
```
/thumbnail 영상제목 | 키워드1,키워드2,... | 타겟오디언스 | [선택] YouTube URL
```

---

## 🎯 예시

### 예시 1: AI 강의
```
/thumbnail ChatGPT로 월급 2배 버는 법 | ChatGPT,AI,자동화,생산성 | 직장인,프리랜서
```

### 예시 2: 도구 강의
```
/thumbnail Notion으로 하루를 관리하기 | Notion,생산성,자동화,데이터베이스 | 학생,직장인
```

### 예시 3: YouTube URL 포함
```
/thumbnail 당신의 AI는 1%도 못 쓰고 있다 | AI,ChatGPT,프롬프트,활용법 | 일반인,창업가 | https://youtube.com/watch?v=abc123
```

---

## ✅ 예상 결과

Slack에 다음과 같이 포스팅됨:

```
🎬 YouTube 썸네일 캡션 제안

영상 제목: ChatGPT 99% 활용법
타겟 오디언스: 직장인,창업가

옵션 1 (점수: 88.5)
"ChatGPT 제대로 쓰면 생산성 10배, 왜 아직도 모르세요?"
✅ CTR 잠재력 높음 | ✅ 팀 톤과 완벽히 일치
[👍 선택]

옵션 2 (점수: 83.0)
"ChatGPT 답변이 영 별로인 이유? 당신이 놓친 3단계"
✅ CTR 잠재력 높음 | ✅ 명확하고 이해하기 쉬움
[👍 선택]

옵션 3 (점수: 76.5)
...

총 18개 캡션 생성됨 | 팀 스타일 가이드 기반 평가
```

---

## 🔧 문제 해결

### 문제: "Command not found: ngrok"
**해결:**
```bash
brew install ngrok
```

### 문제: "Connection refused on localhost:3000"
**해결:**
- 터미널 1에서 Flask 앱이 실행 중인지 확인
- 터미널에서 에러 메시지 확인

### 문제: "Signing secret is invalid"
**해결:**
- Slack 앱에서 Signing Secret 재확인
- `.env` 파일 정확히 복사했는지 확인

### 문제: "Request URL did not respond with 200 OK"
**해결:**
1. ngrok이 실행 중인지 확인
2. Flask 서버가 에러로 중지됐는지 확인
3. ngrok URL이 `/slack/events`로 끝나는지 확인 (예: `https://abc123.ngrok.io/slack/events`)

### 문제: "Slack에서 `/thumbnail` 커맨드가 없음"
**해결:**
- Slash Command가 저장되었는지 확인
- 앱을 워크스페이스에 재설치 필요할 수 있음

---

## 📦 최종 체크

실행 전에 확인:

- [ ] `.env` 파일에 `ANTHROPIC_API_KEY` 설정
- [ ] `.env` 파일에 `SLACK_BOT_TOKEN` 설정
- [ ] `.env` 파일에 `SLACK_SIGNING_SECRET` 설정
- [ ] ngrok 설치 완료
- [ ] Slack 앱에서 `/thumbnail` 커맨드 생성
- [ ] Slack 앱에 "channels:history" scope 있음

---

## 🚀 다음 단계

### 즉시
- [x] `/thumbnail` 커맨드로 로컬 테스트

### 단기 (Phase 2)
- [ ] AWS Lambda로 프로덕션 배포
- [ ] Notion 데이터베이스 연동 (결과 저장)
- [ ] 팀 투표 결과 추적

### 장기 (Phase 3)
- [ ] YouTube API 연동 (실제 CTR 추적)
- [ ] A/B 테스트 자동화
- [ ] 팀 선택 데이터로 모델 학습

---

**준비 완료!** 🎬

Slack Signing Secret만 설정하면 바로 시작할 수 있습니다.
