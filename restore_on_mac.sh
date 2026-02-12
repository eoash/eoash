#!/bin/bash
# Claude Code Mac 복원 스크립트
# 사용법: bash restore_on_mac.sh <백업폴더경로>

set -e  # 에러 발생 시 중단

echo "========================================"
echo "Claude Code Mac 복원"
echo "========================================"
echo

# 백업 폴더 경로 확인
if [ -z "$1" ]; then
    echo "❌ 사용법: bash restore_on_mac.sh <백업폴더경로>"
    echo "예시: bash restore_on_mac.sh ~/Downloads/claude_migration_backup"
    exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ 백업 폴더를 찾을 수 없습니다: $BACKUP_DIR"
    exit 1
fi

echo "백업 위치: $BACKUP_DIR"
echo

# 1. Claude Code Global 설정 복원
echo "[1/5] Claude Code Global 설정 복원 중..."
mkdir -p ~/.claude
if [ -f "$BACKUP_DIR/.claude/settings.json" ]; then
    cp "$BACKUP_DIR/.claude/settings.json" ~/.claude/
    echo "✓ settings.json 복원 완료"
else
    echo "⚠️  settings.json 파일이 백업에 없습니다"
fi

# 2. Auto Memory 복원
echo
echo "[2/5] Auto Memory 복원 중..."
# 프로젝트 이름을 자동으로 감지
PROJECT_NAME=$(basename "$(pwd)")
MEMORY_DIR="$HOME/.claude/projects/$PROJECT_NAME/memory"
mkdir -p "$MEMORY_DIR"

if [ -f "$BACKUP_DIR/.claude/projects/memory/MEMORY.md" ]; then
    cp "$BACKUP_DIR/.claude/projects/memory/MEMORY.md" "$MEMORY_DIR/"
    echo "✓ MEMORY.md 복원 완료"
else
    echo "⚠️  MEMORY.md 파일이 백업에 없습니다"
fi

if [ -f "$BACKUP_DIR/.claude/projects/memory/AGENT_STRUCTURE_PLAN.md" ]; then
    cp "$BACKUP_DIR/.claude/projects/memory/AGENT_STRUCTURE_PLAN.md" "$MEMORY_DIR/"
    echo "✓ AGENT_STRUCTURE_PLAN.md 복원 완료"
else
    echo "⚠️  AGENT_STRUCTURE_PLAN.md 파일이 백업에 없습니다"
fi

echo "✓ Auto memory 경로: $MEMORY_DIR"

# 3. Credentials 복원
echo
echo "[3/5] Credentials 복원 중..."
if [ -f "$BACKUP_DIR/credentials/.env" ]; then
    cp "$BACKUP_DIR/credentials/.env" .
    chmod 600 .env
    echo "✓ .env 복원 완료 (권한: 600)"
else
    echo "⚠️  .env 파일이 백업에 없습니다"
fi

if [ -f "$BACKUP_DIR/credentials/credentials.json" ]; then
    cp "$BACKUP_DIR/credentials/credentials.json" .
    chmod 600 credentials.json
    echo "✓ credentials.json 복원 완료 (권한: 600)"
else
    echo "⚠️  credentials.json 파일이 백업에 없습니다"
fi

if [ -f "$BACKUP_DIR/credentials/token.json" ]; then
    cp "$BACKUP_DIR/credentials/token.json" .
    chmod 600 token.json
    echo "✓ token.json 복원 완료 (권한: 600)"
else
    echo "⚠️  token.json 파일이 백업에 없습니다"
fi

# 4. 대화 히스토리 복원 (선택사항)
echo
echo "[4/5] 대화 히스토리 복원 중 (선택사항)..."
if [ -f "$BACKUP_DIR/.claude/history.jsonl" ]; then
    cp "$BACKUP_DIR/.claude/history.jsonl" ~/.claude/
    echo "✓ history.jsonl 복원 완료"
else
    echo "⚠️  history.jsonl 파일이 백업에 없습니다 (선택사항)"
fi

# 5. Python 가상환경 설정
echo
echo "[5/5] Python 가상환경 설정 중..."
if [ ! -d "venv" ]; then
    echo "Python 가상환경 생성 중..."
    python3 -m venv venv
    echo "✓ 가상환경 생성 완료"
fi

echo "의존성 설치 중..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "✓ 의존성 설치 완료"

# 완료 메시지
echo
echo "========================================"
echo "복원 완료! ✅"
echo "========================================"
echo
echo "다음 단계:"
echo "1. Claude Code 실행:"
echo "   $ claude"
echo
echo "2. Python 환경 테스트:"
echo "   $ source venv/bin/activate"
echo "   $ python -c 'from ash_bot.config import ARConfig; print(\"✅ Config loaded\")'"
echo
echo "3. Dry-run 테스트:"
echo "   $ python scripts/run_daily.py"
echo
echo "설정 확인:"
echo "- Model: sonnet"
echo "- Language: korean"
echo "- Auto memory: $MEMORY_DIR"
echo

# .claude/settings.local.json 경로 업데이트 안내
if [ -f ".claude/settings.local.json" ]; then
    echo "⚠️  주의: .claude/settings.local.json의 Windows 경로를 Mac 경로로 업데이트하세요"
    echo "   (migration_to_mac.md 가이드 참조)"
fi

echo
echo "복원이 완료되었습니다! 🎉"
