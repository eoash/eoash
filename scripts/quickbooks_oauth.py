#!/usr/bin/env python3
"""
QuickBooks OAuth 2.0 재인가 스크립트.

실행 방법:
    python scripts/quickbooks_oauth.py

동작:
    1. 브라우저에서 QuickBooks 승인 페이지 열기
    2. 로컬 서버(8080)에서 콜백 수신
    3. Authorization Code → Refresh Token 교환
    4. .env 파일 자동 업데이트
"""

import sys
import os
import base64
import secrets
import webbrowser
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv, set_key

# 프로젝트 루트 기준 경로 설정
PROJECT_ROOT = Path(__file__).parent.parent
ENV_FILE = PROJECT_ROOT / ".env"

sys.path.insert(0, str(PROJECT_ROOT))
load_dotenv(ENV_FILE)

# QuickBooks OAuth 엔드포인트
AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
REDIRECT_URI = "http://localhost:8080/callback"
SCOPE = "com.intuit.quickbooks.accounting"

# 현재 설정 로드
CLIENT_ID = os.getenv("QUICKBOOKS_CLIENT_ID")
CLIENT_SECRET = os.getenv("QUICKBOOKS_CLIENT_SECRET")

# 콜백 수신용 전역 변수
_auth_code = None  # type: Optional[str]
_realm_id = None   # type: Optional[str]
_error = None      # type: Optional[str]
_state = secrets.token_urlsafe(16)


class CallbackHandler(BaseHTTPRequestHandler):
    """QuickBooks OAuth 콜백 핸들러."""

    def do_GET(self):
        global _auth_code, _realm_id, _error

        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/callback":
            if "code" in params:
                _auth_code = params["code"][0]
                _realm_id = params.get("realmId", [None])[0]
                self._send_success()
            elif "error" in params:
                _error = params.get("error_description", params.get("error", ["알 수 없는 오류"]))[0]
                self._send_error()
        else:
            self.send_response(404)
            self.end_headers()

    def _send_success(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        html = """
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>&#10003; QuickBooks &#51064;&#44032; &#50756;&#47308;!</h2>
        <p>&#51060; &#52952;&#51012; &#45803;&#44256; &#53552;&#48120;&#45084;&#47196; &#46028;&#50500;&#44032;&#49464;&#50836;.</p>
        </body></html>
        """
        self.wfile.write(html.encode("utf-8"))

    def _send_error(self):
        self.send_response(400)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        html = f"""
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>&#10007; &#51064;&#44032; &#49892;&#54168;</h2>
        <p>&#50724;&#47448;: {_error}</p>
        </body></html>
        """
        self.wfile.write(html.encode("utf-8"))

    def log_message(self, format, *args):
        pass  # 불필요한 서버 로그 억제


def build_auth_url() -> str:
    """QuickBooks 인가 URL 생성."""
    params = {
        "client_id": CLIENT_ID,
        "scope": SCOPE,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "state": _state,
    }
    return AUTH_URL + "?" + urllib.parse.urlencode(params)


def exchange_code_for_tokens(code: str) -> dict:
    """Authorization Code를 Access/Refresh Token으로 교환."""
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_string.encode()).decode()

    response = requests.post(
        TOKEN_URL,
        headers={
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        },
    )
    response.raise_for_status()
    return response.json()


def update_env(refresh_token: str, realm_id: str):
    """.env 파일에 새 토큰 저장."""
    set_key(str(ENV_FILE), "QUICKBOOKS_REFRESH_TOKEN", refresh_token)
    if realm_id:
        set_key(str(ENV_FILE), "QUICKBOOKS_REALM_ID", realm_id)
    print(f"  .env 업데이트 완료: {ENV_FILE}")


def verify_connection(refresh_token: str, realm_id: str) -> bool:
    """새 토큰으로 연결 테스트."""
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_string.encode()).decode()

    # 새 access token 발급
    r = requests.post(
        TOKEN_URL,
        headers={
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "refresh_token", "refresh_token": refresh_token},
    )
    r.raise_for_status()
    access_token = r.json()["access_token"]

    # CompanyInfo 조회
    env = os.getenv("QUICKBOOKS_ENV", "production")
    base = (
        "https://sandbox-quickbooks.api.intuit.com"
        if env == "sandbox"
        else "https://quickbooks.api.intuit.com"
    )
    resp = requests.get(
        f"{base}/v3/company/{realm_id}/query",
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        params={"query": "SELECT * FROM CompanyInfo"},
    )
    resp.raise_for_status()

    company_list = resp.json().get("QueryResponse", {}).get("CompanyInfo", [])
    if company_list:
        print(f"  연결된 회사: {company_list[0].get('CompanyName', '(이름 없음)')}")
        return True
    return False


def main():
    print()
    print("=" * 60)
    print("  QuickBooks OAuth 2.0 재인가")
    print("=" * 60)
    print()

    # 사전 검사
    if not CLIENT_ID or not CLIENT_SECRET:
        print("오류: .env에 QUICKBOOKS_CLIENT_ID / QUICKBOOKS_CLIENT_SECRET 없음")
        sys.exit(1)

    print(f"Client ID : {CLIENT_ID[:12]}...")
    print(f"Realm ID  : {os.getenv('QUICKBOOKS_REALM_ID', '(미설정)')}")
    print(f"Redirect  : {REDIRECT_URI}")
    print()

    # Step 1: 브라우저 열기
    auth_url = build_auth_url()
    print("1. 브라우저에서 QuickBooks 인가 페이지를 엽니다...")
    print(f"   {auth_url[:80]}...")
    print()
    webbrowser.open(auth_url)

    # Step 2: 로컬 서버로 콜백 대기
    print("2. localhost:8080 에서 콜백 대기 중... (브라우저에서 승인해주세요)")
    server = HTTPServer(("localhost", 8080), CallbackHandler)
    server.handle_request()  # 콜백 1회 수신 후 종료
    print()

    if _error:
        print(f"오류: {_error}")
        sys.exit(1)

    if not _auth_code:
        print("오류: Authorization Code를 받지 못했습니다.")
        sys.exit(1)

    print(f"   Authorization Code 수신 완료")
    print(f"   Realm ID: {_realm_id}")
    print()

    # Step 3: Token 교환
    print("3. Authorization Code → Refresh Token 교환 중...")
    try:
        tokens = exchange_code_for_tokens(_auth_code)
    except requests.HTTPError as e:
        print(f"   오류: {e}")
        print(f"   응답: {e.response.text}")
        sys.exit(1)

    new_refresh_token = tokens.get("refresh_token")
    new_access_token = tokens.get("access_token")

    if not new_refresh_token:
        print("   오류: Refresh Token을 받지 못했습니다.")
        sys.exit(1)

    print(f"   Refresh Token: {new_refresh_token[:20]}...")
    print(f"   Access Token : {new_access_token[:20]}...")
    print()

    # Step 4: .env 업데이트
    print("4. .env 파일 업데이트 중...")
    update_env(new_refresh_token, _realm_id)
    print()

    # Step 5: 연결 검증
    print("5. 연결 검증 중...")
    try:
        if verify_connection(new_refresh_token, _realm_id):
            print()
            print("=" * 60)
            print("  QuickBooks 재인가 완료!")
            print("  이제 test_quickbooks_connection.py 를 실행해보세요.")
            print("=" * 60)
        else:
            print("   연결 검증 실패: CompanyInfo 조회 결과 없음")
    except requests.HTTPError as e:
        print(f"   검증 오류: {e}")
        print(f"   응답: {e.response.text}")

    print()


if __name__ == "__main__":
    main()
