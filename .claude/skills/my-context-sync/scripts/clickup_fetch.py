"""
ClickUp Task Fetcher
최근 7일간 ClickUp 태스크를 수집하여 JSON으로 저장

환경 변수:
- CLICKUP_API_TOKEN: ClickUp API 토큰
- CLICKUP_TEAM_ID: ClickUp Team ID (선택사항)
"""

import os
import sys
import json
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# .env 파일 로드
try:
    from dotenv import load_dotenv
    load_dotenv(project_root / ".env")
except ImportError:
    print("python-dotenv not installed. Using system environment variables.")


class ClickUpClient:
    """ClickUp API 클라이언트"""

    BASE_URL = "https://api.clickup.com/api/v2"

    def __init__(self, api_token: str):
        self.api_token = api_token
        self.headers = {
            "Authorization": api_token,
            "Content-Type": "application/json"
        }

    def get_authenticated_user(self) -> Dict[str, Any]:
        """현재 인증된 사용자 정보 조회"""
        response = requests.get(
            f"{self.BASE_URL}/user",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def get_teams(self) -> List[Dict[str, Any]]:
        """사용자가 속한 팀 목록 조회"""
        response = requests.get(
            f"{self.BASE_URL}/team",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json().get("teams", [])

    def get_team_tasks(
        self,
        team_id: str,
        assignees: Optional[List[str]] = None,
        statuses: Optional[List[str]] = None,
        due_date_gt: Optional[int] = None,
        due_date_lt: Optional[int] = None,
        date_updated_gt: Optional[int] = None,
        include_closed: bool = True
    ) -> List[Dict[str, Any]]:
        """팀의 태스크 목록 조회"""
        params = {
            "include_closed": str(include_closed).lower()
        }

        if assignees:
            params["assignees[]"] = assignees
        if statuses:
            params["statuses[]"] = statuses
        if due_date_gt:
            params["due_date_gt"] = due_date_gt
        if due_date_lt:
            params["due_date_lt"] = due_date_lt
        if date_updated_gt:
            params["date_updated_gt"] = date_updated_gt

        response = requests.get(
            f"{self.BASE_URL}/team/{team_id}/task",
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json().get("tasks", [])

    def get_task(self, task_id: str) -> Dict[str, Any]:
        """특정 태스크 상세 조회"""
        response = requests.get(
            f"{self.BASE_URL}/task/{task_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()


def fetch_clickup_tasks(days: int = 7, team_id: Optional[str] = None) -> Dict[str, Any]:
    """
    ClickUp 태스크를 수집하여 반환

    Args:
        days: 최근 며칠간의 태스크를 조회할지
        team_id: ClickUp Team ID (없으면 첫 번째 팀 사용)

    Returns:
        수집된 태스크 데이터
    """
    api_token = os.getenv("CLICKUP_API_TOKEN")
    if not api_token:
        return {
            "error": "CLICKUP_API_TOKEN environment variable not set",
            "collected_at": datetime.now().isoformat(),
            "total_count": 0
        }

    try:
        client = ClickUpClient(api_token)

        # 현재 사용자 정보
        user = client.get_authenticated_user()
        user_id = user["user"]["id"]

        # 팀 ID 결정
        if not team_id:
            teams = client.get_teams()
            if not teams:
                return {
                    "error": "No teams found for this user",
                    "collected_at": datetime.now().isoformat(),
                    "total_count": 0
                }
            team_id = teams[0]["id"]
            print(f"Using team: {teams[0]['name']} (ID: {team_id})")

        # 날짜 범위 계산
        now = datetime.now()
        days_ago = now - timedelta(days=days)
        date_updated_gt = int(days_ago.timestamp() * 1000)  # milliseconds
        due_date_lt = int((now + timedelta(days=7)).timestamp() * 1000)  # 7일 이내 마감

        # 나에게 할당된 태스크 조회
        tasks = client.get_team_tasks(
            team_id=team_id,
            assignees=[user_id],
            date_updated_gt=date_updated_gt,
            include_closed=True
        )

        # 태스크 분류
        assigned_tasks = []
        in_progress_tasks = []
        due_soon_tasks = []
        completed_tasks = []
        urgent_tasks = []
        no_due_date_tasks = []
        created_today_tasks = []

        for task in tasks:
            task_data = {
                "id": task["id"],
                "name": task["name"],
                "status": task["status"]["status"],
                "priority": task.get("priority", {}).get("priority", "normal") if task.get("priority") else "normal",
                "due_date": datetime.fromtimestamp(int(task["due_date"]) / 1000).isoformat() if task.get("due_date") else None,
                "date_updated": datetime.fromtimestamp(int(task["date_updated"]) / 1000).isoformat(),
                "url": task["url"],
                "list_name": task.get("list", {}).get("name", ""),
                "folder_name": task.get("folder", {}).get("name", ""),
                "assignees": [a["username"] for a in task.get("assignees", [])]
            }

            assigned_tasks.append(task_data)

            # 진행 중인 태스크
            status_lower = task["status"]["status"].lower()
            if "progress" in status_lower or "doing" in status_lower or "in progress" in status_lower:
                in_progress_tasks.append(task_data)

            # 완료된 태스크 (최근 7일)
            if "closed" in task["status"]["type"].lower() or "complete" in status_lower:
                completed_tasks.append(task_data)

            # 마감 임박 (7일 이내)
            if task.get("due_date"):
                due_timestamp = int(task["due_date"]) / 1000
                if due_timestamp < (now + timedelta(days=7)).timestamp():
                    due_soon_tasks.append(task_data)

            # 긴급 태스크
            priority = task.get("priority", {})
            if priority and priority.get("priority") == "urgent":
                urgent_tasks.append(task_data)

            # due date이 없는 태스크
            if not task.get("due_date"):
                no_due_date_tasks.append(task_data)

            # 오늘 생성한 태스크 (creator가 나이고 오늘 생성됨)
            if task.get("date_created"):
                created_timestamp = int(task["date_created"]) / 1000
                created_date = datetime.fromtimestamp(created_timestamp).date()
                creator_id = task.get("creator", {}).get("id")

                if created_date == now.date() and creator_id == user_id:
                    created_today_tasks.append(task_data)

        result = {
            "collected_at": now.isoformat(),
            "period_days": days,
            "user_id": user_id,
            "team_id": team_id,
            "total_count": len(assigned_tasks),
            "in_progress_count": len(in_progress_tasks),
            "due_soon_count": len(due_soon_tasks),
            "completed_count": len(completed_tasks),
            "urgent_count": len(urgent_tasks),
            "no_due_date_count": len(no_due_date_tasks),
            "created_today_count": len(created_today_tasks),
            "assigned_tasks": assigned_tasks,
            "in_progress_tasks": in_progress_tasks,
            "due_soon_tasks": due_soon_tasks,
            "completed_tasks": completed_tasks,
            "urgent_tasks": urgent_tasks,
            "no_due_date_tasks": no_due_date_tasks,
            "created_today_tasks": created_today_tasks
        }

        return result

    except requests.exceptions.RequestException as e:
        return {
            "error": f"<{type(e).__name__} {str(e)}>",
            "collected_at": datetime.now().isoformat(),
            "total_count": 0
        }
    except Exception as e:
        return {
            "error": f"Unexpected error: {str(e)}",
            "collected_at": datetime.now().isoformat(),
            "total_count": 0
        }


def main():
    parser = argparse.ArgumentParser(description="Fetch ClickUp tasks for the last N days")
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of days to look back (default: 7)"
    )
    parser.add_argument(
        "--team-id",
        type=str,
        default=None,
        help="ClickUp Team ID (optional, uses first team if not specified)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="email_output/clickup_tasks.json",
        help="Output JSON file path"
    )

    args = parser.parse_args()

    print(f"Fetching ClickUp tasks from last {args.days} days...")
    result = fetch_clickup_tasks(days=args.days, team_id=args.team_id)

    # 출력 디렉토리 생성
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # JSON 저장
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"\n✅ ClickUp tasks saved to: {output_path}")

    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print(f"\n📊 Summary:")
        print(f"  - Total assigned tasks: {result['total_count']}")
        print(f"  - In progress: {result['in_progress_count']}")
        print(f"  - Due soon (7 days): {result['due_soon_count']}")
        print(f"  - Completed (last {args.days} days): {result['completed_count']}")
        print(f"  - Urgent: {result['urgent_count']}")
        print(f"  - No due date: {result['no_due_date_count']}")
        print(f"  - Created today: {result['created_today_count']}")


if __name__ == "__main__":
    main()
