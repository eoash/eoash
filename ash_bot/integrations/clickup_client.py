"""
ClickUp API Client for EO Studio
투두리스트 및 작업 관리
"""

import os
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ClickUpClient:
    """ClickUp API 클라이언트"""

    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize ClickUp client

        Args:
            api_token: ClickUp API Token (환경변수에서 자동 로드)
        """
        self.api_token = api_token or os.getenv('CLICKUP_API_TOKEN')
        if not self.api_token:
            raise ValueError("ClickUp API Token이 필요합니다")

        self.base_url = "https://api.clickup.com/api/v2"
        self.headers = {
            "Authorization": self.api_token,
            "Content-Type": "application/json"
        }

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """API 요청 실행"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                **kwargs
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            logger.error(f"ClickUp API 오류: {e}")
            raise

    def get_authorized_user(self) -> Dict:
        """현재 인증된 사용자 정보 조회"""
        return self._make_request("GET", "/user")

    def get_teams(self) -> List[Dict]:
        """워크스페이스(팀) 목록 조회"""
        result = self._make_request("GET", "/team")
        return result.get('teams', [])

    def get_spaces(self, team_id: str) -> List[Dict]:
        """스페이스 목록 조회"""
        result = self._make_request("GET", f"/team/{team_id}/space")
        return result.get('spaces', [])

    def get_lists(self, space_id: str) -> List[Dict]:
        """리스트 목록 조회"""
        result = self._make_request("GET", f"/space/{space_id}/list")
        return result.get('lists', [])

    def get_tasks(
        self,
        list_id: str,
        assignees: Optional[List[str]] = None,
        statuses: Optional[List[str]] = None,
        date_from: Optional[int] = None,
        date_to: Optional[int] = None,
        include_closed: bool = False
    ) -> List[Dict]:
        """
        작업 목록 조회

        Args:
            list_id: List ID
            assignees: 할당자 ID 리스트
            statuses: 상태 필터 (예: ['to do', 'in progress'])
            date_from: 시작 날짜 (Unix timestamp ms)
            date_to: 종료 날짜 (Unix timestamp ms)
            include_closed: 완료된 작업 포함 여부

        Returns:
            작업 리스트
        """
        params = {
            "include_closed": str(include_closed).lower()
        }

        if assignees:
            params['assignees[]'] = assignees

        if statuses:
            params['statuses[]'] = statuses

        if date_from:
            params['date_updated_gt'] = date_from

        if date_to:
            params['date_updated_lt'] = date_to

        result = self._make_request("GET", f"/list/{list_id}/task", params=params)
        return result.get('tasks', [])

    def get_team_tasks(
        self,
        team_id: str,
        assignees: Optional[List[str]] = None,
        due_date_gt: Optional[int] = None,
        due_date_lt: Optional[int] = None,
        include_closed: bool = False
    ) -> List[Dict]:
        """
        팀 전체 작업 조회

        Args:
            team_id: Team ID
            assignees: 할당자 ID 리스트
            due_date_gt: 마감일 이후 (Unix timestamp ms)
            due_date_lt: 마감일 이전 (Unix timestamp ms)
            include_closed: 완료된 작업 포함 여부

        Returns:
            작업 리스트
        """
        params = {
            "include_closed": str(include_closed).lower()
        }

        if assignees:
            params['assignees[]'] = assignees

        if due_date_gt:
            params['due_date_gt'] = due_date_gt

        if due_date_lt:
            params['due_date_lt'] = due_date_lt

        result = self._make_request("GET", f"/team/{team_id}/task", params=params)
        return result.get('tasks', [])

    def get_today_tasks(self, team_id: str, user_id: Optional[str] = None) -> List[Dict]:
        """
        오늘 마감 작업 조회

        Args:
            team_id: Team ID
            user_id: 사용자 ID (없으면 모든 사용자)

        Returns:
            오늘 마감 작업 리스트
        """
        # 오늘 00:00 ~ 23:59
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)

        due_date_gt = int(today_start.timestamp() * 1000)
        due_date_lt = int(today_end.timestamp() * 1000)

        assignees = [user_id] if user_id else None

        return self.get_team_tasks(
            team_id=team_id,
            assignees=assignees,
            due_date_gt=due_date_gt,
            due_date_lt=due_date_lt,
            include_closed=False
        )

    def get_upcoming_tasks(
        self,
        team_id: str,
        user_id: Optional[str] = None,
        days: int = 7
    ) -> List[Dict]:
        """
        다가오는 마감 작업 조회

        Args:
            team_id: Team ID
            user_id: 사용자 ID
            days: 며칠 이내 (기본 7일)

        Returns:
            다가오는 작업 리스트
        """
        now = datetime.now()
        end_date = now + timedelta(days=days)

        due_date_gt = int(now.timestamp() * 1000)
        due_date_lt = int(end_date.timestamp() * 1000)

        assignees = [user_id] if user_id else None

        return self.get_team_tasks(
            team_id=team_id,
            assignees=assignees,
            due_date_gt=due_date_gt,
            due_date_lt=due_date_lt,
            include_closed=False
        )

    def create_task(
        self,
        list_id: str,
        name: str,
        description: Optional[str] = None,
        due_date: Optional[datetime] = None,
        priority: Optional[int] = None,
        assignees: Optional[List[str]] = None,
        status: Optional[str] = None
    ) -> Dict:
        """
        새 작업 생성

        Args:
            list_id: List ID
            name: 작업 제목
            description: 작업 설명
            due_date: 마감일 (datetime 객체)
            priority: 우선순위 (1=긴급, 2=높음, 3=보통, 4=낮음)
            assignees: 할당자 ID 리스트
            status: 상태 (예: 'to do', 'in progress')

        Returns:
            생성된 작업 정보
        """
        data = {
            "name": name
        }

        if description:
            data["description"] = description

        if due_date:
            # datetime을 Unix timestamp (milliseconds)로 변환
            data["due_date"] = int(due_date.timestamp() * 1000)

        if priority:
            data["priority"] = priority

        if assignees:
            data["assignees"] = assignees

        if status:
            data["status"] = status

        result = self._make_request("POST", f"/list/{list_id}/task", json=data)
        logger.info(f"작업 생성 완료: {name}")
        return result

    def get_default_list(self, team_id: str, user_id: str) -> Optional[str]:
        """
        사용자의 기본 리스트 찾기 (Personal List 우선)

        Args:
            team_id: Team ID
            user_id: User ID

        Returns:
            List ID (없으면 None)
        """
        try:
            spaces = self.get_spaces(team_id)

            for space in spaces:
                lists = self.get_lists(space['id'])

                for lst in lists:
                    # Personal List 찾기
                    if 'personal' in lst['name'].lower():
                        return lst['id']

            # Personal List가 없으면 첫 번째 리스트 반환
            if spaces and len(spaces) > 0:
                lists = self.get_lists(spaces[0]['id'])
                if lists and len(lists) > 0:
                    return lists[0]['id']

        except Exception as e:
            logger.error(f"기본 리스트 찾기 오류: {e}")

        return None

    def format_task_summary(self, task: Dict) -> str:
        """작업을 요약 형식으로 포맷"""
        name = task.get('name', 'Untitled')
        status = task.get('status', {}).get('status', 'Unknown')
        priority = task.get('priority')

        # 우선순위 이모지
        priority_emoji = {
            1: '🔴',  # Urgent
            2: '🟠',  # High
            3: '🟡',  # Normal
            4: '🟢',  # Low
        }.get(priority, '⚪')

        # 마감일
        due_date = task.get('due_date')
        due_str = ''
        if due_date:
            due_dt = datetime.fromtimestamp(int(due_date) / 1000)
            due_str = f" (마감: {due_dt.strftime('%m/%d %H:%M')})"

        return f"{priority_emoji} {name}{due_str}"


if __name__ == '__main__':
    # 테스트 코드
    import sys
    import io

    # Windows 콘솔 인코딩 설정
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    logging.basicConfig(level=logging.INFO)

    try:
        client = ClickUpClient()
        print("✅ ClickUp 연결 성공!")

        # 사용자 정보
        user = client.get_authorized_user()
        print(f"\n👤 사용자: {user['user']['username']}")

        # 워크스페이스
        teams = client.get_teams()
        print(f"\n📁 워크스페이스: {len(teams)}개")
        for team in teams:
            print(f"  - {team['name']} (ID: {team['id']})")

    except Exception as e:
        print(f"❌ 오류: {e}")
