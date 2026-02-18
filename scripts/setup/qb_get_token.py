#!/usr/bin/env python
"""
QuickBooks OAuth 2.0 Refresh Token 발급 스크립트.

흐름:
1. Authorization URL 출력 → 브라우저에서 열어서 QuickBooks 로그인/승인
2. 로컬 포트 8080에서 콜백 수신
3. Authorization Code → Refresh Token 교환
4. .env 파일에 자동 저장
"""

import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

import urllib.parse
import urllib.request
import base64
import json
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread

CLIENT_ID     = os.getenv("QUICKBOOKS_CLIENT_ID")
CLIENT_SECRET = os.getenv("QUICKBOOKS_CLIENT_SECRET")
REDIRECT_URI  = "http://localhost:8080/callback"
SCOPE         = "com.intuit.quickbooks.accounting"
AUTH_URL      = "https://appcenter.intuit.com/connect/oauth2"
TOKEN_URL     = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

auth_code = None  # 콜백에서 받은 code


class CallbackHandler(BaseHTTPRequestHandler):
    """OAuth 콜백 수신용 로컬 서버."""

    def do_GET(self):
        global auth_code
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                "<html><body><h2>✅ 인증 완료!</h2>"
                "<p>이 창을 닫고 터미널로 돌아가세요.</p></body></html>".encode("utf-8")
            )
        else:
            error = params.get("error", ["unknown"])[0]
            self.send_response(400)
            self.end_headers()
            self.wfile.write(f"<html><body><h2>❌ 오류: {error}</h2></body></html>".encode("utf-8"))

    def log_message(self, format, *args):
        pass  # 서버 로그 억제


def exchange_code_for_tokens(code: str) -> dict:
    """Authorization Code를 Access/Refresh Token으로 교환."""
    auth_str = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_str.encode()).decode()

    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode()

    req = urllib.request.Request(
        TOKEN_URL,
        data=data,
        headers={
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }
    )

    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def save_refresh_token(refresh_token: str):
    """Refresh Token을 .env 파일에 저장."""
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        ".env"
    )

    with open(env_path, "r", encoding="utf-8") as f:
        content = f.read()

    if "QUICKBOOKS_REFRESH_TOKEN=" in content:
        lines = content.splitlines()
        new_lines = []
        for line in lines:
            if line.startswith("QUICKBOOKS_REFRESH_TOKEN="):
                new_lines.append(f"QUICKBOOKS_REFRESH_TOKEN={refresh_token}")
            else:
                new_lines.append(line)
        content = "\n".join(new_lines)
    else:
        content += f"\nQUICKBOOKS_REFRESH_TOKEN={refresh_token}\n"

    with open(env_path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("❌ .env에 QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET 필요")
        sys.exit(1)

    # 1. Authorization URL 생성
    params = urllib.parse.urlencode({
        "client_id":     CLIENT_ID,
        "response_type": "code",
        "scope":         SCOPE,
        "redirect_uri":  REDIRECT_URI,
        "state":         "eo_studio_qb",
    })
    auth_full_url = f"{AUTH_URL}?{params}"

    print("\n" + "="*60)
    print("  QuickBooks OAuth 인증")
    print("="*60)
    print("\n아래 URL을 브라우저에서 열어 QuickBooks에 로그인/승인하세요:")
    print(f"\n  {auth_full_url}\n")

    # 자동으로 브라우저 열기 시도
    try:
        webbrowser.open(auth_full_url)
        print("  (브라우저가 자동으로 열렸습니다)")
    except Exception:
        print("  (브라우저를 수동으로 열어주세요)")

    print("\n  로컬 서버(port 8080)에서 콜백 대기 중...\n")

    # 2. 로컬 서버로 콜백 수신
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.timeout = 120  # 2분 대기

    global auth_code
    while auth_code is None:
        server.handle_request()

    if not auth_code:
        print("❌ Authorization Code를 받지 못했습니다.")
        sys.exit(1)

    print(f"  ✅ Authorization Code 수신 완료")

    # 3. Token 교환
    print("  토큰 교환 중...")
    try:
        tokens = exchange_code_for_tokens(auth_code)
    except Exception as e:
        print(f"  ❌ 토큰 교환 실패: {e}")
        sys.exit(1)

    refresh_token = tokens.get("refresh_token")
    access_token  = tokens.get("access_token")

    if not refresh_token:
        print(f"  ❌ Refresh Token 없음. 응답: {tokens}")
        sys.exit(1)

    print(f"  ✅ Access Token:  {access_token[:20]}...")
    print(f"  ✅ Refresh Token: {refresh_token[:20]}...")

    # 4. .env에 저장
    save_refresh_token(refresh_token)
    print(f"\n  ✅ .env에 QUICKBOOKS_REFRESH_TOKEN 저장 완료")
    print("\n  이제 연결 테스트를 실행하세요:")
    print("  venv/Scripts/python.exe scripts/setup/test_connections.py\n")


if __name__ == "__main__":
    main()
