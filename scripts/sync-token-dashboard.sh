#!/bin/bash
# sync-token-dashboard.sh
# 모노레포(eoash/eoash)의 token-dashboard/ 변경을
# 별도 레포(eoash/token-dashboard)에 동기화
#
# 사용법:
#   ./scripts/sync-token-dashboard.sh              # 자동 커밋 메시지
#   ./scripts/sync-token-dashboard.sh "메시지"     # 커밋 메시지 지정

set -e

MONO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TD_DIR="$MONO_ROOT/token-dashboard"

# 서브레포 존재 확인
if [ ! -d "$TD_DIR/.git" ]; then
  echo "❌ token-dashboard/.git 없음 — 별도 레포가 설정되지 않았습니다"
  exit 1
fi

cd "$TD_DIR"

# 변경 사항 확인
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "✅ token-dashboard 이미 동기화 상태 (변경 없음)"
  exit 0
fi

# 커밋 메시지: 인자로 전달받거나, 모노레포의 최신 token-dashboard 커밋 메시지 사용
if [ -n "$1" ]; then
  COMMIT_MSG="$1"
else
  COMMIT_MSG=$(git -C "$MONO_ROOT" log -1 --format="%s" -- token-dashboard/ 2>/dev/null || echo "")
  if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="sync: monorepo changes"
  fi
fi

# 변경 내용 표시
echo "📋 변경된 파일:"
git status --short
echo ""

# Stage & Commit & Push
git add -A
git commit -m "$COMMIT_MSG"
git push origin main

echo ""
echo "✅ eoash/token-dashboard 동기화 완료"
echo "   커밋: $COMMIT_MSG"
