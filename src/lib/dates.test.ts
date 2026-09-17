import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { parseDate, fmtDate, fmtRange, daysUntil, humanUntil, isPast } from "./dates";

describe("parseDate", () => {
  it("parseert een geldige ISO-datum", () => {
    const d = parseDate("2026-09-20");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8); // september = 8
    expect(d?.getDate()).toBe(20);
  });
  it("geeft null bij leeg of ongeldig", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("geen-datum")).toBeNull();
  });
});

describe("fmtDate", () => {
  it("formatteert Nederlands", () => {
    expect(fmtDate("2026-09-20")).toBe("20 sep 2026");
    expect(fmtDate("2026-12-23")).toBe("23 dec 2026");
  });
  it("geeft — bij null", () => {
    expect(fmtDate(null)).toBe("—");
  });
});

describe("fmtRange", () => {
  it("kort binnen hetzelfde jaar", () => {
    expect(fmtRange("2026-09-16", "2026-09-20")).toBe("16 sep – 20 sep");
  });
  it("volledig over jaargrens", () => {
    expect(fmtRange("2026-12-30", "2027-01-03")).toBe("30 dec 2026 – 3 jan 2027");
  });
});

describe("dagen tot deadline (met vaste 'vandaag')", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17, 12, 0, 0)); // 17 sep 2026
  });
  afterAll(() => vi.useRealTimers());

  it("daysUntil telt correct", () => {
    expect(daysUntil("2026-09-20")).toBe(3);
    expect(daysUntil("2026-09-17")).toBe(0);
    expect(daysUntil("2026-09-15")).toBe(-2);
    expect(daysUntil(null)).toBeNull();
  });
  it("isPast klopt", () => {
    expect(isPast("2026-09-15")).toBe(true);
    expect(isPast("2026-09-20")).toBe(false);
    expect(isPast("2026-09-17")).toBe(false);
  });
  it("humanUntil in het Nederlands", () => {
    expect(humanUntil("2026-09-17")).toBe("vandaag");
    expect(humanUntil("2026-09-18")).toBe("morgen");
    expect(humanUntil("2026-09-20")).toBe("over 3 dagen");
    expect(humanUntil("2026-09-15")).toBe("2 dagen geleden");
  });
});
