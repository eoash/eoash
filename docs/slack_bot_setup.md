# Slack Bot 설정 가이드

매일 아침 투두리스트를 Slack DM으로 받기 위한 Slack Bot 설정 방법입니다.

## 1. Slack App 생성

1. https://api.slack.com/apps 접속
2. **"Create New App"** 클릭
3. **"From scratch"** 선택
4. App 이름: `EO Studio Todo Bot` (또는 원하는 이름)
5. Workspace 선택: EO Studio 워크스페이스
6. **"Create App"** 클릭

## 2. Bot Token Scopes 추가

1. 왼쪽 메뉴에서 **"OAuth & Permissions"** 클릭
2. **"Scopes"** 섹션으로 스크롤
3. **"Bot Token Scopes"**에 다음 권한 추가:
   - `chat:write` - 메시지 전송
   - `users:read` - 사용자 정보 조회
   - `users:read.email` - 이메일로 사용자 찾기
   - `im:write` - DM 보내기
   - `im:read` - DM 채널 열기

## 3. Bot 설치

1. 같은 페이지 상단으로 스크롤
2. **"Install to Workspace"** 클릭
3. 권한 확인 후 **"Allow"** 클릭

## 4. Bot Token 복사

1. 설치 완료 후 **"Bot User OAuth Token"**이 표시됩니다
2. `xoxb-`로 시작하는 토큰을 복사합니다
3. `.env` 파일에 추가:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token-here
   ```

## 5. Slack User ID 찾기

### 방법 1: Slack 앱에서 직접 찾기

1. Slack 데스크톱 앱 또는 웹 열기
2. 자기 자신의 프로필 클릭
3. **"..."** (더보기) 클릭
4. **"Copy member ID"** 클릭
5. `.env` 파일에 추가:
   ```
   SLACK_USER_ID=U01234ABCDE
   ```

### 방법 2: Python 스크립트로 찾기

```python
from slack_sdk import WebClient

client = WebClient(token="xoxb-your-token")
response = client.users_lookupByEmail(email="your-email@eo.studio")
print(response['user']['id'])
```

또는 이메일로 자동 조회하도록 스크립트를 수정할 수 있습니다.

## 6. 테스트

`.env` 파일 설정 후:

```bash
python scripts/send_daily_todo.py
```

Slack DM으로 투두리스트가 도착하는지 확인합니다.

## 7. 자동 실행 설정 (선택사항)

### Windows Task Scheduler

매일 아침 9시에 자동 실행:

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Python314\python.exe" `
    -Argument "C:\Users\ash\새 폴더\scripts\send_daily_todo.py" `
    -WorkingDirectory "C:\Users\ash\새 폴더"

$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

Register-ScheduledTask -Action $action -Trigger $trigger `
    -TaskName "EO Studio Daily Todo" `
    -Description "매일 아침 ClickUp 투두리스트 Slack DM 전송"
```

또는 `scripts/setup_todo_scheduler.ps1` 스크립트를 실행하세요.

## 문제 해결

### Bot Token 오류
- `.env` 파일에 `SLACK_BOT_TOKEN`이 정확히 설정되었는지 확인
- `xoxb-`로 시작하는지 확인

### DM 전송 실패
- Bot Token Scopes에 `im:write` 권한이 있는지 확인
- Slack User ID가 정확한지 확인

### User ID를 모를 때
- Slack 프로필에서 "Copy member ID" 사용
- 또는 이메일로 조회하는 스크립트 사용

## 참고

- Slack API 문서: https://api.slack.com/
- OAuth & Permissions: https://api.slack.com/authentication/oauth-v2
