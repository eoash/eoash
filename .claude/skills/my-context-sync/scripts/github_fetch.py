"""
GitHub 수집 스크립트
사용법: uv run python github_fetch.py --days 7
       python github_fetch.py --days 7

필요한 환경변수:
  GITHUB_PERSONAL_ACCESS_TOKEN : GitHub Personal Access Token

토큰 발급:
  https://github.com/settings/tokens 에서 생성
  필요 권한: repo, read:user

설치:
  pip install requests python-dotenv
"""

import argparse
import io
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Windows 터미널 인코딩 문제 방지
if sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
    load_dotenv(Path(__file__).parent.parent.parent.parent / ".env")
except ImportError:
    pass


def get_token() -> str:
    token = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN")
    if not token:
        print("ERROR: GITHUB_PERSONAL_ACCESS_TOKEN 환경변수가 없습니다.")
        print("설정 방법: .env 파일에 GITHUB_PERSONAL_ACCESS_TOKEN=ghp_... 추가")
        print("토큰 발급: https://github.com/settings/tokens")
        sys.exit(1)
    return token


def gh_get(token: str, url: str, params: dict = None):
    try:
        import requests
    except ImportError:
        print("ERROR: requests 라이브러리가 없습니다. pip install requests")
        sys.exit(1)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    resp = requests.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_github(days: int = 7) -> dict:
    token = get_token()
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    since_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    result = {
        "username": None,
        "open_prs": [],
        "review_requested": [],
        "open_issues": [],
        "recent_commits": [],
        "merged_prs": [],
        "fetched_at": datetime.now().isoformat(),
    }

    try:
        # 내 사용자명 조회
        user = gh_get(token, "https://api.github.com/user")
        username = user["login"]
        result["username"] = username

        # 1. 내가 만든 열린 PR
        pr_data = gh_get(token, "https://api.github.com/search/issues", {
            "q": f"author:{username} is:pr is:open updated:>{since_date}",
            "per_page": 20,
            "sort": "updated",
        })
        for item in pr_data.get("items", []):
            result["open_prs"].append({
                "title": item["title"],
                "repo": item["repository_url"].split("/repos/")[1],
                "url": item["html_url"],
                "updated_at": item["updated_at"][:10],
                "number": item["number"],
            })

        # 2. 내게 리뷰 요청된 PR
        review_data = gh_get(token, "https://api.github.com/search/issues", {
            "q": f"review-requested:{username} is:pr is:open",
            "per_page": 10,
            "sort": "updated",
        })
        for item in review_data.get("items", []):
            result["review_requested"].append({
                "title": item["title"],
                "repo": item["repository_url"].split("/repos/")[1],
                "url": item["html_url"],
                "updated_at": item["updated_at"][:10],
                "number": item["number"],
            })

        # 3. 내가 관여한 열린 이슈
        issue_data = gh_get(token, "https://api.github.com/search/issues", {
            "q": f"involves:{username} is:issue is:open updated:>{since_date}",
            "per_page": 10,
            "sort": "updated",
        })
        for item in issue_data.get("items", []):
            result["open_issues"].append({
                "title": item["title"],
                "repo": item["repository_url"].split("/repos/")[1],
                "url": item["html_url"],
                "updated_at": item["updated_at"][:10],
                "number": item["number"],
            })

        # 4. 최근 커밋 (내 repo들에서 직접 조회)
        repos_data = gh_get(token, f"https://api.github.com/user/repos", {
            "sort": "pushed",
            "per_page": 20,
            "affiliation": "owner,collaborator",
        })
        for repo in repos_data:
            repo_name = repo["full_name"]
            pushed_at = repo.get("pushed_at", "")
            if pushed_at and pushed_at < since:
                continue
            try:
                commits = gh_get(token, f"https://api.github.com/repos/{repo_name}/commits", {
                    "author": username,
                    "since": since,
                    "per_page": 10,
                })
                for commit in commits:
                    sha = commit["sha"][:7]
                    msg = commit["commit"]["message"].split("\n")[0][:80]
                    date = commit["commit"]["author"]["date"][:10]
                    result["recent_commits"].append({
                        "sha": sha,
                        "message": msg,
                        "repo": repo_name,
                        "date": date,
                    })
                if len(result["recent_commits"]) >= 20:
                    break
            except Exception:
                continue

        # 5. 최근 머지된 PR
        merged_data = gh_get(token, "https://api.github.com/search/issues", {
            "q": f"author:{username} is:pr is:merged merged:>{since_date}",
            "per_page": 10,
            "sort": "updated",
        })
        for item in merged_data.get("items", []):
            result["merged_prs"].append({
                "title": item["title"],
                "repo": item["repository_url"].split("/repos/")[1],
                "url": item["html_url"],
                "updated_at": item["updated_at"][:10],
                "number": item["number"],
            })

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    parser = argparse.ArgumentParser(description="GitHub 수집 스크립트")
    parser.add_argument("--days", type=int, default=7, help="수집할 기간 (일)")
    parser.add_argument("--json", action="store_true", help="JSON 형식으로 출력")
    args = parser.parse_args()

    data = fetch_github(days=args.days)

    if args.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return

    username = data.get("username", "unknown")
    print(f"=== GitHub 수집 결과 (@{username}, 최근 {args.days}일) ===")
    print()

    if data["open_prs"]:
        print(f"[열린 PR - {len(data['open_prs'])}개]")
        for pr in data["open_prs"]:
            print(f"  * [{pr['updated_at']}] #{pr['number']} {pr['title']}")
            print(f"    {pr['repo']}")
    else:
        print("[열린 PR] 없음")
    print()

    if data["review_requested"]:
        print(f"[리뷰 요청된 PR - {len(data['review_requested'])}개]")
        for pr in data["review_requested"]:
            print(f"  * [{pr['updated_at']}] #{pr['number']} {pr['title']}")
            print(f"    {pr['repo']}")
    else:
        print("[리뷰 요청된 PR] 없음")
    print()

    if data["open_issues"]:
        print(f"[관여한 이슈 - {len(data['open_issues'])}개]")
        for issue in data["open_issues"]:
            print(f"  * [{issue['updated_at']}] #{issue['number']} {issue['title']}")
            print(f"    {issue['repo']}")
    else:
        print("[관여한 이슈] 없음")
    print()

    if data["recent_commits"]:
        print(f"[최근 커밋 - {len(data['recent_commits'])}개]")
        for commit in data["recent_commits"]:
            print(f"  * [{commit['date']}] {commit['sha']} {commit['message']}")
            print(f"    {commit['repo']}")
    else:
        print("[최근 커밋] 없음")
    print()

    if data["merged_prs"]:
        print(f"[머지된 PR - {len(data['merged_prs'])}개]")
        for pr in data["merged_prs"]:
            print(f"  * [{pr['updated_at']}] #{pr['number']} {pr['title']}")
            print(f"    {pr['repo']}")
    else:
        print("[머지된 PR] 없음")

    if "error" in data:
        print(f"\n오류: {data['error']}")


if __name__ == "__main__":
    main()
