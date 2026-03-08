# CLAUDE.md — Leave Dashboard

## 프로젝트 개요

EO Studio 연차 관리 대시보드. 근로기준법 기반 자동 연차 계산.
현재 **개발 초기 단계** — 미완료 항목 다수.

---

## 기술 스택

| 항목 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 |
| Data | Airtable API |
| Path alias | `@/*` → `./src/*` |

---

## 페이지 구조

| 경로 | 페이지 |
|------|--------|
| `/` | 전체 연차 현황 |
| `/member` | 개인별 상세 |

---

## 주요 파일

| 파일 | 역할 |
|------|------|
| `src/lib/airtable.ts` | Airtable API 연동 |
| `src/lib/leave-calc.ts` | 근로기준법 연차 계산 로직 |
| `src/lib/types.ts` | TypeScript 타입 |

---

## 데이터 소스

- **Airtable Base**: `이오테이블` (apphaMgCZMSN3ysHk)
- **인증**: `AIRTABLE_TOKEN` (.env.local)

---

## 미완료 항목

- [ ] 입사일 필드 연동
- [ ] 재직자 필터링 (퇴사자 제외)
- [ ] 반차(0.5일) 처리
- [ ] Vercel 배포
- [ ] Slack `/연차` 슬래시 커맨드 연동

---

## 디자인 컨벤션

- token-dashboard / finance-dashboard와 동일 다크 테마 지향 (`#0A0A0A`, 액센트 `#E8FF47`)
- KpiCard, InfoTip 등 공통 컴포넌트 패턴 재사용 예정
