# Leave Dashboard Design

## Overview
EO Studio 직원 연차 관리 대시보드. 직원이 자기 연차 잔여일수를 확인하고, 관리자가 전체 현황을 볼 수 있는 Next.js 웹앱.

## Data Sources
- `이오테이블 (apphaMgCZMSN3ysHk)` > 근태관리 (`tblN1dgUFEK1x65Jy`) - 연차 사용 기록
- `이오테이블` > 연락처 (`tbl8mPvzdtyy1HIkK`) - 직원 명부 (EO Team 뷰)
- 차감 대상: 분류="연차" only, 삭제 요청=true 제외

## Leave Calculation (근로기준법)
- 입사 1년 미만: 매월 1일 (최대 11일)
- 입사 1년 이상: 15일
- 입사 3년 이상: 2년마다 +1일
- 최대: 25일

## Tech Stack
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 + recharts
- Airtable REST API

## Pages
- `/` - 전체 현황 (KPI 카드 + 직원 테이블)
- `/member/[name]` - 개인 상세 (사용 내역 타임라인)

## Required Data Changes
- 연락처 테이블에 "입사일" 필드 추가 필요
