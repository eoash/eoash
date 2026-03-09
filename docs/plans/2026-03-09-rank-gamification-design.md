# Token Dashboard — RPG Gamification Design

## Overview
token-dashboard에 RPG 게이미피케이션 시스템 도입.
레벨, XP, 칭호, 업적 배지로 AI 도구 사용을 촉진.

## XP System

### XP Sources
| Activity | XP | Note |
|----------|-----|------|
| Token usage | 1 XP / 10K tokens | `input + output` only (no cache_read) |
| Active day | 50 XP / day | Any usage counts |
| Commit | 10 XP / each | Git activity |
| PR | 30 XP / each | Git activity |
| Streak bonus | ×1.5 | Applied to daily XP when streak ≥ 3 days |

### Level Table (8 tiers)
| Lv | Required XP | Title (KR) | Title (EN) | Icon |
|----|-------------|-----------|------------|------|
| 1 | 0 | 코드 새싹 | Code Sprout | 🌱 |
| 2 | 50 | 견습 코더 | Apprentice | ⚡ |
| 3 | 200 | 코드 기사 | Code Knight | ⚔️ |
| 4 | 1,000 | 마법 개발자 | Arcane Dev | 🔮 |
| 5 | 5,000 | 코드 마법사 | Code Wizard | 🧙 |
| 6 | 25,000 | 대마법사 | Archmage | 🌟 |
| 7 | 80,000 | 전설의 코더 | Legendary | 👑 |
| 8 | 200,000 | AI 네이티브 | AI Native | 🐉 |

## Achievements (38 badges)

### Onboarding (4)
| Badge | Name | Condition |
|-------|------|-----------|
| 🌅 | First Light | First token usage |
| 📝 | First Commit | First AI commit |
| 🔀 | First PR | First AI PR |
| 🎓 | Level Up! | Reach Lv.2 |

### Streak (13)
| Badge | Name | Condition |
|-------|------|-----------|
| 🕯️ | Spark | 2 consecutive days |
| 🔥 | On Fire | 3 days |
| 🔥🔥 | Blazing | 5 days |
| ☄️ | Unstoppable | 7 days |
| 🌟 | Two Weeks Strong | 14 days |
| 💎 | Diamond Streak | 30 days |
| 🏔️ | Iron Will | 60 days |
| 🐉 | Eternal Flame | 100 days |
| ⚗️ | Alchemist | 150 days |
| 🗿 | Monolith | 200 days |
| 🌌 | Event Horizon | 365 days |
| 🪬 | Immortal | 500 days |
| 🏆∞ | Millennium | 1000 days |

### Volume (5)
| Badge | Name | Condition |
|-------|------|-----------|
| 💬 | Chatty | Daily output 100K |
| 🌊 | Token Flood | Daily output 1M |
| 🌋 | Eruption | Daily output 5M |
| ⚡ | Thunder | Daily output 10M |
| 🪐 | Supernova | Daily output 20M |

### Cumulative (4)
| Badge | Name | Condition |
|-------|------|-----------|
| 🧱 | Builder | 50 cumulative commits |
| 🏗️ | Architect | 200 commits |
| 🏛️ | Monument | 500 commits |
| 🌆 | City Planner | 50 cumulative PRs |

### Multi-tool (3)
| Badge | Name | Condition |
|-------|------|-----------|
| 🤖 | Dual Wielder | 2 tools used |
| 🎯 | Triple Threat | 3 tools used |
| 🔄 | Polyglot | 3+ models used |

### Champion (4)
| Badge | Name | Condition |
|-------|------|-----------|
| 🏆 | Weekly Champion | Weekly #1 once |
| 👑 | Reigning Champion | Weekly #1 3x consecutive |
| 🎖️ | Veteran Champion | Weekly #1 10x total |
| 🐐 | GOAT | Weekly #1 20x total |

### Time-based (3)
| Badge | Name | Condition |
|-------|------|-----------|
| 🌙 | Night Owl | Activity between 00:00-06:00 |
| 🌤️ | Early Bird | Activity between 06:00-08:00 |
| 🗓️ | Weekend Warrior | Activity on Sat/Sun |

### Level Milestone (2)
| Badge | Name | Condition |
|-------|------|-----------|
| 🧙 | Wizard Class | Reach Lv.5 |
| 🐉 | Transcendence | Reach Lv.8 AI Native |

## /rank Page Layout

### Sections (top to bottom)
1. **Character Card** — Selected user's RPG profile (dropdown selector, localStorage)
2. **Party Ranking** — All members sorted by XP, showing Lv/title
3. **Achievement Collection** — Badge grid by category (colored=earned, ?=locked)
4. **Weekly Champions** — Existing component with Lv badge added

### Mobile
- Full-width vertical stack
- Party ranking: hide title column, show Lv + name + XP only

## WeeklyChampions Renewal
- Add `Lv.N icon` before name
- Add "모험가 길드 →" link to /rank

## Technical Notes
- All XP/level/achievement computed client-side from existing API data
- No new database or API endpoints needed
- Streak calculation: count consecutive dates with any activity per user
- User selection: dropdown (no auth), persisted in localStorage
