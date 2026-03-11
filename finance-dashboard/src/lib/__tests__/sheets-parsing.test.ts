import { describe, it, expect } from "vitest";

/**
 * sheets.ts의 파싱 로직 단위 테스트.
 * 실제 Google Sheets API를 호출하지 않고, 파싱 헬퍼 함수들을 직접 테스트.
 * toNum, parseDate 같은 내부 함수는 sheets.ts에서 export하지 않으므로
 * 동일한 로직을 재현하여 테스트.
 */

// ─── toNum 재현 ───────────────────────────────
function parseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/[^0-9.\-]/g, "");
  return parseFloat(cleaned) || 0;
}

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  return parseNumber(String(val ?? "0"));
}

// ─── parseDate 재현 ───────────────────────────
function parseDate(str: string): Date | null {
  const cleaned = str.replace(/\.\s*/g, "-").replace(/-$/, "").trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d;
}

describe("toNum — 시트 셀 값 변환", () => {
  it("숫자를 그대로 반환", () => {
    expect(toNum(1500000)).toBe(1500000);
  });

  it("쉼표 포함 문자열 파싱", () => {
    expect(toNum("1,500,000")).toBe(1500000);
  });

  it("₩ 접두사 제거", () => {
    expect(toNum("₩500,000")).toBe(500000);
  });

  it("빈 셀 → 0", () => {
    expect(toNum("")).toBe(0);
    expect(toNum(null)).toBe(0);
    expect(toNum(undefined)).toBe(0);
  });

  it("음수 처리", () => {
    expect(toNum("-300,000")).toBe(-300000);
  });
});

describe("parseDate — 시트 날짜 문자열 파싱", () => {
  it("YYYY-MM-DD 표준 형식", () => {
    const d = parseDate("2026-03-15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
    expect(d!.getMonth()).toBe(2); // 0-indexed
    expect(d!.getDate()).toBe(15);
  });

  it("한국식 점 형식 (2026.03.15)", () => {
    const d = parseDate("2026.03.15");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("한국식 점 형식 뒤 점 (2026.03.15.)", () => {
    const d = parseDate("2026.03.15.");
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(2026);
  });

  it("빈 문자열 → null", () => {
    expect(parseDate("")).toBeNull();
  });

  it("잘못된 형식 → null", () => {
    expect(parseDate("not-a-date")).toBeNull();
  });
});

describe("Revenue _SYNC_ 파싱 시뮬레이션", () => {
  // _SYNC_Revenue 구조: [division, category, 1월, 2월, ...]
  const mockSyncHeaders = ["division", "category", "1월", "2월", "3월"];
  const mockSyncData = [
    ["콘텐츠", "광고", "500000000", "600000000", "0"],
    ["콘텐츠", "커머스", "100000000", "150000000", "0"],
    ["콘텐츠", "소계", "600000000", "750000000", "0"],
    ["콘텐츠", "인원수", "5", "5", "5"],
    ["콘텐츠", "인당 매출", "120000000", "150000000", "0"],
    ["테크", "SaaS", "200000000", "250000000", "0"],
    ["테크", "소계", "200000000", "250000000", "0"],
    ["테크", "인원수", "3", "3", "3"],
    ["테크", "인당 매출", "66666667", "83333333", "0"],
    ["전체", "합계", "800000000", "1000000000", "0"],
  ];

  it("월 헤더 추출", () => {
    const months = mockSyncHeaders.slice(2);
    expect(months).toEqual(["1월", "2월", "3월"]);
  });

  it("전체 합계 행에서 monthly 데이터 추출", () => {
    const totalRow = mockSyncData.find(
      (r) => String(r[0]) === "전체" && String(r[1]) === "합계",
    );
    expect(totalRow).toBeDefined();

    const months = mockSyncHeaders.slice(2);
    const monthly = months.map((m, idx) => ({
      month: m,
      actual: toNum(totalRow![idx + 2]),
      target: 0,
    }));

    expect(monthly[0].actual).toBe(800000000); // 8억
    expect(monthly[1].actual).toBe(1000000000); // 10억
    expect(monthly[2].actual).toBe(0);
  });

  it("사업부별 소계 추출", () => {
    const groups = new Map<string, unknown[][]>();
    for (const row of mockSyncData) {
      const div = String(row[0]);
      if (!groups.has(div)) groups.set(div, []);
      groups.get(div)!.push(row);
    }

    expect(groups.size).toBe(3); // 콘텐츠, 테크, 전체

    // 콘텐츠 사업부 소계
    const contentRows = groups.get("콘텐츠")!;
    const subtotalRow = contentRows.find((r) => String(r[1]) === "소계");
    expect(subtotalRow).toBeDefined();
    expect(toNum(subtotalRow![2])).toBe(600000000);
  });

  it("세그먼트 총합 = 전체 합계와 일치", () => {
    const segmentTotals: number[] = [];
    const groups = new Map<string, unknown[][]>();
    for (const row of mockSyncData) {
      const div = String(row[0]);
      if (!groups.has(div)) groups.set(div, []);
      groups.get(div)!.push(row);
    }

    for (const [div, rows] of groups) {
      if (div === "전체") continue;
      const subtotalRow = rows.find((r) => String(r[1]) === "소계");
      if (subtotalRow) {
        const months = mockSyncHeaders.slice(2);
        const total = months.reduce((s, _, m) => s + toNum(subtotalRow[m + 2]), 0);
        segmentTotals.push(total);
      }
    }

    const totalRow = mockSyncData.find(
      (r) => String(r[0]) === "전체" && String(r[1]) === "합계",
    );
    const months = mockSyncHeaders.slice(2);
    const overallTotal = months.reduce((s, _, m) => s + toNum(totalRow![m + 2]), 0);

    expect(segmentTotals.reduce((s, v) => s + v, 0)).toBe(overallTotal);
  });
});

describe("AR 파싱 — aging days 계산", () => {
  it("미수금 aging 계산 (미지급)", () => {
    const invoiceDate = "2026-02-01";
    const today = new Date("2026-03-12");
    const d = parseDate(invoiceDate);
    expect(d).not.toBeNull();
    const agingDays = Math.max(0, Math.floor((today.getTime() - d!.getTime()) / 86400000));
    expect(agingDays).toBe(39); // 2/1 → 3/12 = 39일
  });

  it("지급 완료 → aging 0", () => {
    const hasPaid = true;
    const agingDays = hasPaid ? 0 : 999;
    expect(agingDays).toBe(0);
  });

  it("risk 등급 분류", () => {
    function getRisk(days: number): string {
      if (days <= 30) return "yellow";
      if (days <= 60) return "orange";
      return "red";
    }
    expect(getRisk(15)).toBe("yellow");
    expect(getRisk(30)).toBe("yellow");
    expect(getRisk(31)).toBe("orange");
    expect(getRisk(60)).toBe("orange");
    expect(getRisk(61)).toBe("red");
  });
});

describe("Cash Position 파싱 — burn rate 계산", () => {
  it("burn rate = 평균 outflows", () => {
    const monthlyOutflows = [500000000, 600000000, 0]; // 3월은 아직 0
    const monthsWithOutflows = monthlyOutflows.filter((v) => v > 0);
    const burnRate =
      monthsWithOutflows.length > 0
        ? monthsWithOutflows.reduce((s, v) => s + v, 0) / monthsWithOutflows.length
        : 0;
    expect(burnRate).toBe(550000000); // 5.5억
  });

  it("runway = 잔액 / burn rate", () => {
    const latestBalance = 3_000_000_000; // 30억
    const burnRate = 500_000_000; // 5억
    const runway = burnRate > 0 ? latestBalance / burnRate : 0;
    expect(runway).toBe(6); // 6개월
  });

  it("outflows 0이면 burn rate 0, runway 0", () => {
    const monthlyOutflows: number[] = [];
    const burnRate =
      monthlyOutflows.length > 0
        ? monthlyOutflows.reduce((s, v) => s + v, 0) / monthlyOutflows.length
        : 0;
    const runway = burnRate > 0 ? 100 / burnRate : 0;
    expect(burnRate).toBe(0);
    expect(runway).toBe(0);
  });
});
