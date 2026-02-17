#!/bin/bash

# YouTube 썸네일 봇 시작 스크립트

PROJECT_DIR="/Users/ash/Documents/eoash"
VENV="$PROJECT_DIR/venv/bin/python"

echo "🎬 YouTube 썸네일 봇 시작..."
echo ""
echo "⚠️  주의: 다음 2개 터미널을 동시에 실행해야 합니다:"
echo ""
echo "=== 터미널 1: Flask 앱 실행 ==="
echo "cd $PROJECT_DIR"
echo "$VENV scripts/slack_thumbnail_handler.py"
echo ""
echo "=== 터미널 2: ngrok 터널 생성 ==="
echo "ngrok http 3000"
echo ""
echo "그 다음:"
echo "1. ngrok 출력에서 URL 복사 (예: https://abc123.ngrok.io)"
echo "2. https://api.slack.com/apps"
echo "3. Slash Commands → Edit → Request URL에 다음 입력:"
echo "   https://YOUR-NGROK-URL/slack/events"
echo "4. Slack에서 테스트:"
echo "   /thumbnail ChatGPT 99% 활용법 | ChatGPT,프롬프트,AI | 직장인,창업가"
echo ""
echo "준비 되셨으면 엔터를 누르세요..."
read

cd "$PROJECT_DIR"
$VENV scripts/slack_thumbnail_handler.py
