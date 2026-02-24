"""Slack Block Kit 메시지 빌더."""


class MessageBuilder:
    @staticmethod
    def welcome(text: str) -> list[dict]:
        return [
            {"type": "section", "text": {"type": "mrkdwn", "text": text}},
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "시작하기 🚀"},
                        "action_id": "start_onboarding",
                        "style": "primary",
                    }
                ],
            },
        ]

    @staticmethod
    def mission(mission: dict, checked: list[str] | None = None) -> list[dict]:
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": mission["title"]}},
            {"type": "section", "text": {"type": "mrkdwn", "text": mission["description"]}},
        ]
        mission_type = mission["type"]
        mission_id = mission["id"]

        if mission_type == "checklist":
            checked = checked or []
            elements = []
            for item in mission["items"]:
                prefix = "✅ " if item in checked else ""
                elements.append({
                    "type": "button",
                    "text": {"type": "plain_text", "text": f"{prefix}{item}"},
                    "action_id": f"check_{mission_id}_{item}",
                    "value": item,
                })
            blocks.append({"type": "actions", "elements": elements})

        elif mission_type == "quiz":
            blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"*{mission['question']}*"}})
            elements = []
            for i, option in enumerate(mission["options"]):
                elements.append({
                    "type": "button",
                    "text": {"type": "plain_text", "text": option},
                    "action_id": f"quiz_{mission_id}_{i}",
                    "value": str(i),
                })
            blocks.append({"type": "actions", "elements": elements})

        elif mission_type == "confirm":
            blocks.append({
                "type": "actions",
                "elements": [{
                    "type": "button",
                    "text": {"type": "plain_text", "text": "완료 ✅"},
                    "action_id": f"confirm_{mission_id}",
                    "style": "primary",
                }],
            })
        return blocks

    @staticmethod
    def mission_complete(message: str) -> list[dict]:
        return [{"type": "section", "text": {"type": "mrkdwn", "text": f"✅ {message}"}}]

    @staticmethod
    def mission_wrong(message: str) -> list[dict]:
        return [{"type": "section", "text": {"type": "mrkdwn", "text": f"❌ {message}"}}]

    @staticmethod
    def progress_update(completed: int, total: int, category: str | None) -> list[dict]:
        pct = int(completed / total * 100) if total > 0 else 0
        filled = int(pct / 10)
        bar = "█" * filled + "░" * (10 - filled)
        text = f"*진행률: {bar} {pct}%* ({completed}/{total} 완료)"
        if category:
            text += f"\n다음 카테고리: *{category}*"
        return [
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": text}},
        ]

    @staticmethod
    def category_intro(name: str, emoji: str) -> list[dict]:
        return [
            {"type": "divider"},
            {"type": "header", "text": {"type": "plain_text", "text": f"{emoji} {name}"}},
        ]

    @staticmethod
    def all_complete(message: str) -> list[dict]:
        return [
            {"type": "divider"},
            {"type": "section", "text": {"type": "mrkdwn", "text": message}},
        ]

    @staticmethod
    def hr_status(users: list[dict]) -> list[dict]:
        blocks = [
            {"type": "header", "text": {"type": "plain_text", "text": "📊 온보딩 현황"}},
            {"type": "divider"},
        ]
        if not users:
            blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": "진행 중인 온보딩이 없습니다."}})
            return blocks
        done_count = 0
        in_progress = 0
        for u in users:
            if u.get("completed_at"):
                icon = "✅"
                status = "완료"
                done_count += 1
            else:
                icon = "🔄"
                status = f"{u['completed']}/{u['total']} 진행 중"
                in_progress += 1
            blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"{icon} *{u['user_name']}* — {status}"}})
        blocks.append({"type": "divider"})
        blocks.append({"type": "context", "elements": [{"type": "mrkdwn", "text": f"총 {len(users)}명 | 완료 {done_count} | 진행 중 {in_progress}"}]})
        return blocks

    @staticmethod
    def reminder(user_name: str, remaining: int) -> list[dict]:
        return [
            {"type": "section", "text": {"type": "mrkdwn", "text": f"안녕하세요 {user_name}님! 아직 미션 {remaining}개가 남아있어요 😊\n이어서 해볼까요?"}},
            {
                "type": "actions",
                "elements": [{
                    "type": "button",
                    "text": {"type": "plain_text", "text": "이어하기 ▶️"},
                    "action_id": "resume_onboarding",
                    "style": "primary",
                }],
            },
        ]
