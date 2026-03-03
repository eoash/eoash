# EO Studio Slack 팀 채널 데이터 (Public Only)

> **복구 완료** (2026-03-03)
>
> Slack API로 Public/Private 구분 후, Public 채널만 다시 학습.
> 실제 Private 채널(#team-operation, #2026-global-heads, #team-eo-vietnam)은 제외.

---

## 1. #team-design (Public)

### 주요 멤버
- **Jay Jemin Park** (Design Lead) — 디자인팀 총괄, EO 홈페이지 개발
- **이지현 (Jihyeon Lee)** — 영상 후반작업, 모션그래픽, 프로덕션 디자인
- **SoYoung Park** — 디자이너 (인턴→정규)
- **박결** — 모션그래픽 관련
- **Gunwook Yoo** (CCO) — 디자인 품질 피드백

### 업무 & 프로세스
- **프로젝트**: TestBox 영상 제작, Lio 펀딩 영상, Pensive 런칭 영상, EO 홈페이지 빌딩
- **주요 도구**: Figma, Frame.io (영상 피드백), Linear (이슈 관리), Claude Code, Higgsfield (AI B-roll), Kling (AI 영상)
- **디자인 시스템**: Tone of Voice 가이드라인 구축 중 (브랜드 페르소나, Do's & Don'ts)
- **명함 리디자인**: 진행 중 (종이 + 후가공 테스트)
- **외주 관리**: 모션그래픽 프리랜서 풀 운영 (블루달, 권민주 등), Frame.io로 피드백 전달
- **온보딩**: 디자인팀 인턴 온보딩 문서 Notion에 존재 (Claude Code로 작성)
- **파일 관리**: Google Drive에 프로젝트별 폴더 정리, Final 폴더 분리
- **썸네일 가이드**: Photoshop 배경 제거 시 drop shadow 미적용 상태로 저장 → Figma/Drive에 클린 파일 업로드

### 온보딩 인사이트
- EO 홈페이지를 Claude Code로 빌딩 중 (Figma MCP 연동)
- 디자인팀 미팅은 주 1회 sync (Huddle)
- Frame.io에 상세 피드백을 남기는 것이 중요

---

## 2. #team-product (Public)

### 주요 멤버
- **최성흠** — Product Lead, 개발 인프라 총괄
- **Jay Jemin Park** — EO 홈페이지 개발, 디자인-개발 브릿지
- **김채은 (Chaeeun Kim)** — 서버 개발, EO School 다국어 파이프라인

### 업무 & 프로세스
- **프로젝트**: EO Magazine (eo-magazine-front), EO Homepage, EO School
- **인프라**: Vercel (배포), GitHub Actions (CI), Cloudflare/Tailscale (네트워크), AWS S3+Lambda (자막 추출)
- **AI 에이전트 "Waddle Dee"**: Mac Mini에서 돌아가는 Claude Code 기반 코딩 에이전트 — Linear 이슈 자동 처리, PR 생성
- **코드 리뷰**: GitHub PR 기반, Vercel Preview 배포로 확인
- **모노레포**: EO-Studio-Dev/eo (client/apps 하위)
- **디자인 시스템**: 코드에서의 색상/컴포넌트 관리 방안 논의 중
- **Linear**: AI agent 가이드 문서 존재, Claude Code deeplink 지원

### 온보딩 인사이트
- Waddle Dee가 응답 안 할 때 → 최성흠에게 문의 (Mac Mini 스토리지/토큰 만료 이슈)
- 환경변수 관리: Vercel 환경별 (prod/rc/dev/preview) 분리
- GitHub Actions 사용량 제한 주의 (비용 모니터링)

---

## 3. #team-gl-media (Public)

### 주요 멤버
- **Gunwook Yoo** (CCO) — 콘텐츠 전략, 인터뷰 진행, 영상 피드백
- **김태용 (TY, CEO)** — 비즈니스 전략, AI 파이프라인
- **임찬우 (Chanwoo Lim)** — 촬영, 편집, 숏폼
- **임지윤 (Jiyoon)** — Thinking Mode 시리즈, 편집
- **남희주 (Heejoo Nam)** — 편집, 컬러 그레이딩
- **강유진 (Jade Yoojin Kang)** — 스토리라인 작성, 드래프트
- **윤서영 (Seo Young Youn)** — 야놀자 프로젝트, 비즈니스 디벨롭
- **Hyeri Jo** — 아티클, 매거진
- **Jeebin Lee** — 프로덕션

### 업무 & 프로세스
- **매출 목표**: 2026년 $7M
- **콘텐츠 전략**: Premium (심층 인터뷰) + Standard (주간 포맷 콘텐츠) 2-tier
- **주요 인터뷰이**: a16z GP들, Kalshi, TestBox, QFEX, Po-Shen Loh(수학교수), Legora, micro1
- **촬영 장비**: 별도 Gear List (Google Sheets), 백업 프로세스 Notion에 문서화
- **영상 제작 플로우**: 인터뷰 → 스토리라인 작성 → 편집 → Frame.io 피드백 → 수정 → 발행
- **핵심 원칙**: 인터뷰 직후 24시간 내 편집 시작 (기억 감퇴 방지), B-roll은 사전 요청
- **AI 활용**: 인터뷰 질문 스코어링/시뮬레이션, 카드뉴스 Gamma API 자동 생성, AI 기반 아티클 초안
- **숏폼**: 촬영 후 3개씩 묶어 스케줄 업로드
- **마감 관리**: 슬랙 채널+봇으로 마감일 관리 아이디어 논의 중

### 온보딩 인사이트
- 영상 편집 후 Frame.io에 업로드하여 피드백 수집
- Final Cut Pro + Red Giant 플러그인 사용
- YouTube 채널 월 100만 뷰 회복, 목표 400만
- 콘텐츠 발행 시 intellectual tension(지적 긴장감) 중요
- "우리가 레퍼런스가 되어야지, 레퍼런스를 따라가면 안 된다"

---

## 4. #team-kr-media (Public)

### 주요 멤버
- **김중철** — KR 비즈니스/미디어
- **송승환** — 번역 콘텐츠 관리
- **Gunwook Yoo** — 한국 채널 피드백

### 업무 & 프로세스
- 글로벌 콘텐츠 → 한국 번역/로컬라이징
- 번역 콘텐츠는 **랭킹모드 우선** 발행 (시의성 중요)
- 팩트체크 철저히 — 인물 직함/역할 변경 여부 확인 필수
- 한국 채널 전용 IP 기획 (이달의CEO 시리즈 등)
- 너무 늦게 올리면 "철지난 정보를 최신것처럼 이야기하는 채널"로 보일 위험

### 온보딩 인사이트
- 글로벌 영상 번역 시 최신 정보 반영 필수
- 한국 시청자 특성 고려한 로컬라이징

---

## 5. #team-gl-business (Public)

### 주요 멤버
- **Gunwook Yoo** (CCO) — 비즈니스 총괄, 클라이언트 관리
- **김태용 (TY)** — CEO, 딜 클로징
- **안서현 (ASH)** — Finance & Operations (계약서, 인보이스, 결제)
- **윤환준** — 운영 매니저
- **윤서영** — 야놀자 등 한국 클라이언트
- **김중철** — 한국 비즈니스

### 주요 프로젝트 & 규모
| 프로젝트 | 규모 | 상태 |
|----------|------|------|
| TestBox | $120-160K | 진행 중 |
| Kalshi 브랜드 다큐 | $65-80K | 진행 중 |
| Altos 30주년 다큐 | TBD | 진행 중 |
| Yanolja 솔루션 영상 | ~₩60-75M | 진행 중 |
| Forerunner HITL | $20-25K | 논의 중 |
| LayerZero | TBD | 계약 완료 |
| Paraform | TBD | 논의 중 |

### 업무 & 프로세스
- **계약서**: Google Drive 공유폴더 `거래처 발송서류들`에 누적 관리
- **파일명 규칙**: `2026-01-29_ProjectName_DocType_v1`
- **인보이스 발행**: Bill.com (US), 청구스 (KR)
- **계약 서명**: DocuSign
- **프로젝트 관리**: ClickUp (상태+예산 업데이트)
- **결제 확인**: 매주 금요일 ASH와 체크인
- **제안서 제작**: Claude → Markdown → Cursor → Lovable → 클라이언트 공유
- **미국 영상 공유**: Box 도입 검토 중 (a16z 등 대기업 보안 요구)

### 온보딩 인사이트
- 모든 계약서/견적서/인보이스는 공유폴더에서 관리 (개인 PC 저장 X)
- 파일명에 날짜 포함 필수
- 프로젝트 비용은 ClickUp에서 트래킹

---

## 6. #kr-비즈니스 (Public)

### 주요 멤버
- **김중철** — 한국 비즈니스 총괄
- **박도연 (Doyeon Zen Park)** — B2G 사업 개발
- **이제우 (Jewoo LEE)** — 사업 개발
- **김현아, 김찬희** — 팀원

### 업무 & 프로세스
- **B2G 사업**: 나라장터 입찰 공고 리서치 시스템 개발 (HWP/DOC/PDF 분석)
- **내부 SaaS 툴**: 유사도 기반 입찰 리서치 → RFP 분석 → 제안서 배경/목적/개요 자동 생성
- **업종코드**: 학술연구용역(1169) 등록 여부 확인 필요
- **야놀자**: 솔루션 영상 계약 진행 (₩60-75M)
- **온라인 강의 플랫폼**: 러닝스푼즈 등 교육 콘텐츠 사업 검토

### 온보딩 인사이트
- 한국 B2B/B2G 사업은 김중철님 중심으로 운영
- 나라장터 입찰 시스템은 내부 개발 중

---

## 삭제 유지 채널 (실제 Private)
- `#team-operation` — Private
- `#2026-global-heads` — Private
- `#team-eo-vietnam` — Private

이 채널들의 데이터는 학습하지 않았습니다.
