/**
 * 근로기준법 기준 연차 발생일수 계산
 *
 * - 입사 1년 미만: 1개월 개근 시 1일 (최대 11일)
 * - 입사 1년 이상: 15일
 * - 입사 3년 이상: 2년마다 +1일
 * - 최대: 25일
 */
export function calculateEntitledLeave(
  joinDate: string,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): number {
  const join = new Date(joinDate);
  const ref = new Date(referenceDate);

  const diffMs = ref.getTime() - join.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 0;

  // 근속년수
  const yearsOfService = diffDays / 365.25;

  if (yearsOfService < 1) {
    // 1년 미만: 매월 1일, 최대 11일
    const months = Math.floor(diffDays / 30);
    return Math.min(months, 11);
  }

  // 1년 이상: 15일 기본
  // 3년 이상: 2년마다 +1일 (최대 25일)
  const fullYears = Math.floor(yearsOfService);
  const extraDays = fullYears >= 3 ? Math.floor((fullYears - 1) / 2) : 0;

  return Math.min(15 + extraDays, 25);
}

/**
 * 특정 연도의 연차 사용일수 합산
 * - 분류가 "연차"인 것만
 * - 삭제 요청된 것 제외
 */
export function sumUsedLeave(
  records: { category: string; days: number; startDate: string; deleteRequested: boolean }[],
  year: number
): number {
  return records
    .filter(
      (r) =>
        r.category === "연차" &&
        !r.deleteRequested &&
        new Date(r.startDate).getFullYear() === year
    )
    .reduce((sum, r) => sum + r.days, 0);
}
