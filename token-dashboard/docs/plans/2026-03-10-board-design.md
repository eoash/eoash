# Board (게시판) 설계 — 2026-03-10

## 개요

토큰 대시보드에 게시판 추가. 업데이트 노트/안내문 + 팀원 프로덕트 공유.

## 결정 사항

| 항목 | 결정 |
|---|---|
| 작성 권한 | 서현님: 공지, 팀원: 프로덕트 공유 |
| 데이터 저장 | Notion DB |
| 카테고리 | 공지 / 프로덕트 (2가지) |
| UI 형태 | Overview 위젯 + `/board` 전체 페이지 |
| 프로덕트 카드 | 제목 + 한줄 설명 + 썸네일 + 링크 + 작성자 + 날짜 |
| 이모지 반응 | 👍 좋아요, 💡 인사이트, 🙌 응원 |

## Notion DB 스키마

| 속성 | 타입 | 용도 |
|---|---|---|
| 제목 | Title | 글 제목 |
| 카테고리 | Select | `공지` / `프로덕트` |
| 본문 | Rich Text | 내용 |
| 작성자 | Select | 팀원 이름 |
| 썸네일 | Files & Media | 스크린샷/이미지 |
| 링크 | URL | 프로덕트 URL |
| 고정 | Checkbox | 상단 고정 (공지용) |
| 공개 | Checkbox | 대시보드 표시 여부 |
| 날짜 | Date | 작성일 |
| 👍 | Number | 좋아요 카운트 |
| 💡 | Number | 인사이트 카운트 |
| 🙌 | Number | 응원 카운트 |

## UI 구조

### `/board` 페이지
- 카테고리 필터 탭: [전체] [공지] [프로덕트]
- 공지: 리스트형 (텍스트 위주, 📌 고정 가능)
- 프로덕트: 카드 그리드 (썸네일 + 한줄 설명 + 링크)
- 모바일 1열, 데스크톱 2열

### Overview 위젯
- 최신 2~3개 미니 카드
- "더보기 →" → `/board`

### Sidebar
- Overview 바로 아래 위치
- 📋 아이콘

## 파일 구조

```
src/app/board/page.tsx              ← /board 페이지
src/app/api/board/route.ts          ← GET: 글 목록, POST: 이모지 반응
src/components/board/BoardFeed.tsx   ← 글 목록 (공지 리스트 + 프로덕트 그리드)
src/components/board/PostCard.tsx    ← 개별 카드
src/components/board/ReactionBar.tsx ← 👍💡🙌 버튼 + 카운트
src/components/board/LatestPosts.tsx ← Overview용 미니 위젯
src/lib/notion-board.ts             ← Notion API 클라이언트
```

## 데이터 흐름

```
Notion DB → /api/board (GET)  → 글 목록 (revalidate: 300)
         → /api/board (POST) → 이모지 반응 +1/-1 (Notion update)
```

## 이모지 반응

- Notion에 👍/💡/🙌 숫자 속성으로 저장
- 클릭 시 Notion API로 +1 또는 -1
- 중복 방지: localStorage `board-reactions = { "post-id": ["👍"] }`
- 이미 누른 이모지는 토글 (취소)

## 환경변수

```
NOTION_BOARD_DB_ID=<DB ID>
NOTION_API_KEY=<Integration Token>
```

## i18n 키 (추가 예정)

- `nav.board`, `board.title`, `board.latest`, `board.more`
- `board.category.all`, `board.category.notice`, `board.category.product`
- `board.pin`, `board.reaction.*`
