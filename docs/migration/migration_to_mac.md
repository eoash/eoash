# Claude Code Mac 마이그레이션 가이드

## 📋 체크리스트

### Phase 1: Windows에서 준비 (현재 컴퓨터)

#### 1. Git 저장소 커밋 & 푸시
```bash
cd "C:\Users\ash\새 폴더"
git add .
git status
git commit -m "Pre-migration: Save all changes"
git push origin main
```

#### 2. Claude Code 설정 백업
```bash
# 백업 디렉토리 생성
mkdir claude_backup
cd claude_backup

# Global settings 복사
mkdir -p .claude
copy "%USERPROFILE%\.claude\settings.json" .claude\

# Auto memory 복사
mkdir -p .claude\projects\memory
copy "%USERPROFILE%\.claude\projects\C--Users-ash-----\memory\MEMORY.md" .claude\projects\memory\
copy "%USERPROFILE%\.claude\projects\C--Users-ash-----\memory\AGENT_STRUCTURE_PLAN.md" .claude\projects\memory\

# (선택) 대화 히스토리 백업
copy "%USERPROFILE%\.claude\history.jsonl" .claude\
```

#### 3. Credentials 백업 (.env 파일들)
```bash
# 프로젝트 루트로 이동
cd "C:\Users\ash\새 폴더"

# 백업 ZIP 생성 (비밀번호 보호 권장)
# 다음 파일들을 USB나 안전한 클라우드에 저장:
# - .env
# - credentials.json
# - token.json
```

⚠️ **보안 주의**: `.env`, `credentials.json`, `token.json`은 절대 Git에 푸시하지 마세요!

---

### Phase 2: Mac에서 설정 (새 컴퓨터)

#### 1. Claude Code CLI 설치
```bash
# Mac에서
npm install -g claude-code
# 또는
brew install claude-code  # Homebrew 사용 시
```

#### 2. Git 저장소 클론
```bash
cd ~/Documents  # 또는 원하는 위치
git clone <repository-url> eo-studio-ar-automation
cd eo-studio-ar-automation
```

#### 3. Python 환경 설정
```bash
# Python 3.10+ 확인
python3 --version

# 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 의존성 설치
pip install -r requirements.txt
```

#### 4. Claude Code Global 설정 복사
```bash
# ~/.claude 디렉토리 생성
mkdir -p ~/.claude/projects/eo-studio-ar/memory

# settings.json 복사 (Windows 백업에서)
cp <백업위치>/.claude/settings.json ~/.claude/

# Auto memory 복사
cp <백업위치>/.claude/projects/memory/MEMORY.md ~/.claude/projects/eo-studio-ar/memory/
cp <백업위치>/.claude/projects/memory/AGENT_STRUCTURE_PLAN.md ~/.claude/projects/eo-studio-ar/memory/
```

#### 5. Credentials 복원
```bash
cd ~/Documents/eo-studio-ar-automation

# .env 파일 생성 (백업에서 복사)
# credentials.json, token.json 복사

# 권한 설정
chmod 600 .env credentials.json token.json
```

#### 6. Project-local 설정 검증
```bash
# 이미 Git에 포함되어 있음
ls -la .claude/settings.local.json
```

---

### Phase 3: 검증

#### 1. Claude Code 실행
```bash
cd ~/Documents/eo-studio-ar-automation
claude
```

#### 2. 설정 확인
- [ ] 모델이 "sonnet"으로 설정되어 있는지
- [ ] 언어가 "korean"으로 설정되어 있는지
- [ ] Auto memory가 로드되는지 (MEMORY.md 내용 확인)

#### 3. 프로젝트 테스트
```bash
# Python 환경 테스트
source venv/bin/activate
python -c "from ash_bot.config import ARConfig; print('✅ Config loaded')"

# API 연결 테스트 (dry-run)
python scripts/run_daily.py  # DRY_RUN=true로 설정
```

#### 4. Git 작업 확인
```bash
git status
git log --oneline -5
```

---

## 🔧 Mac 전용 설정 조정

### Permissions 업데이트 필요
`.claude/settings.local.json`의 Windows 경로들을 Mac 경로로 업데이트:

```json
{
  "permissions": {
    "allow": [
      "Bash(python3:*)",
      "Bash(pip install:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)",
      "Bash(curl:*)",
      "WebSearch"
    ]
  }
}
```

### Scheduler 설정 (cron 사용)
Windows에서 Task Scheduler를 사용했다면, Mac에서는 cron 설정:

```bash
# crontab 편집
crontab -e

# 매일 오전 9시에 AR 자동화 실행
0 9 * * * cd ~/Documents/eo-studio-ar-automation && source venv/bin/activate && python scripts/run_daily.py

# 매주 월요일 오전 9시에 주간 리포트
0 9 * * MON cd ~/Documents/eo-studio-ar-automation && source venv/bin/activate && python scripts/run_weekly.py
```

---

## 📝 Path 변경사항

### Windows → Mac 경로 매핑

| Windows | Mac |
|---------|-----|
| `C:\Users\ash\.claude\` | `~/.claude/` |
| `C:\Users\ash\새 폴더\` | `~/Documents/eo-studio-ar-automation/` |
| `%USERPROFILE%` | `$HOME` 또는 `~` |
| `\` (백슬래시) | `/` (슬래시) |

### .env 파일 경로 확인
- Windows: `C:\Users\ash\새 폴더\.env`
- Mac: `~/Documents/eo-studio-ar-automation/.env`

---

## ⚠️ 주의사항

1. **Credentials 보안**
   - `.env`, `credentials.json`, `token.json`은 USB나 암호화된 클라우드로 이동
   - 절대 이메일이나 Git에 포함하지 말 것

2. **Auto Memory 경로**
   - Mac에서 프로젝트 이름이 달라지면 auto memory 경로도 변경됨
   - `~/.claude/projects/<new-project-name>/memory/`

3. **Python 버전**
   - Windows와 Mac에서 Python 버전이 동일한지 확인
   - 필요 시 `pyenv`로 버전 관리

4. **Line Endings**
   - Git 설정: `git config core.autocrlf input` (Mac에서)
   - Windows CRLF → Unix LF 자동 변환

---

## ✅ 완료 후 확인

- [ ] Claude Code가 한국어로 응답하는지
- [ ] Auto memory가 로드되는지 (Seohyun Ahn 컨텍스트)
- [ ] Git 저장소가 정상 작동하는지
- [ ] Python 환경이 활성화되는지
- [ ] API credentials가 작동하는지
- [ ] Slack/Notion 알림이 발송되는지

---

## 🆘 트러블슈팅

### "Permission denied" 에러
```bash
chmod +x scripts/*.py
chmod 600 .env credentials.json token.json
```

### Auto memory가 로드되지 않음
```bash
# Claude Code 재시작
# 또는 프로젝트 경로 확인
ls -la ~/.claude/projects/
```

### Python module not found
```bash
source venv/bin/activate
pip install -r requirements.txt
```

---

**마이그레이션 완료 예상 시간**: 30-60분
**마지막 업데이트**: 2026-02-12
