import { describe, expect, it } from "vitest";
import {
  aggregateReadingDayNumbers,
  aggregateReadingDays,
  calculateReadingDayStreak,
  calculateReadingStreak,
  dateInTimeZone,
  dateToDayNumber,
  isValidTimeZone,
  preserveReadingDayOffset,
} from "@/server/lib/reading-log";

describe("reading log domain helpers", () => {
  it("uses the saved timezone when deriving a reading day", () => {
    expect(dateInTimeZone("2026-08-11T15:30:00.000Z", "Asia/Tokyo")).toBe(
      "2026-08-12",
    );
    expect(
      dateInTimeZone("2026-08-11T15:30:00.000Z", "America/Los_Angeles"),
    ).toBe("2026-08-11");
  });

  it("rejects unknown timezones without rejecting valid IANA zones", () => {
    expect(isValidTimeZone("Asia/Tokyo")).toBe(true);
    expect(isValidTimeZone("Not/A/Timezone")).toBe(false);
  });

  it("counts a streak from yesterday while today is still open", () => {
    expect(
      calculateReadingStreak(["2026-08-09", "2026-08-10"], "2026-08-11"),
    ).toBe(2);
    expect(
      calculateReadingStreak(["2026-08-08", "2026-08-10"], "2026-08-11"),
    ).toBe(1);
  });

  it("starts a new streak today and breaks after a blank day", () => {
    expect(
      calculateReadingStreak(["2026-08-10", "2026-08-11"], "2026-08-11"),
    ).toBe(2);
    expect(calculateReadingStreak(["2026-08-08"], "2026-08-11")).toBe(0);
  });

  it("sums pages across books and returns zero for unrecorded days", () => {
    expect(
      aggregateReadingDays(
        [
          { date: "2026-08-10", pagesRead: 12 },
          { date: "2026-08-10", pagesRead: 8 },
          { date: "2026-08-12", pagesRead: 4 },
        ],
        ["2026-08-10", "2026-08-11", "2026-08-12"],
      ),
    ).toEqual([
      { date: "2026-08-10", pagesRead: 20 },
      { date: "2026-08-11", pagesRead: 0 },
      { date: "2026-08-12", pagesRead: 4 },
    ]);
  });

  it("keeps the logical reading day stable when a timezone crosses midnight", () => {
    const now = new Date("2026-08-12T00:30:00.000Z");
    const offset = preserveReadingDayOffset(
      0,
      now,
      "Asia/Tokyo",
      "America/Los_Angeles",
    );
    const oldDay = dateToDayNumber("2026-08-12");
    const newDay = dateToDayNumber(dateInTimeZone(now, "America/Los_Angeles"));

    expect(offset).toBe(1);
    expect(newDay + offset).toBe(oldDay);
    expect(calculateReadingDayStreak([oldDay], newDay + offset)).toBe(1);
  });

  it("aggregates logs by their stable logical day number", () => {
    const day = dateToDayNumber("2026-08-12");
    expect(
      aggregateReadingDayNumbers(
        [
          { date: "2026-08-12", pagesRead: 3, readingDay: day },
          { date: "2026-08-11", pagesRead: 2, readingDay: day },
        ],
        [day, day + 1],
      ),
    ).toEqual([
      { date: "2026-08-12", pagesRead: 5, readingDay: day },
      { date: "2026-08-13", pagesRead: 0, readingDay: day + 1 },
    ]);
  });

  it("uses the current logical axis for graph labels", () => {
    const logicalDay = dateToDayNumber("2026-08-12");
    expect(
      aggregateReadingDayNumbers(
        [{ date: "2026-08-12", pagesRead: 4, readingDay: logicalDay }],
        [logicalDay],
        new Map([[logicalDay, "2026-08-11"]]),
      ),
    ).toEqual([{ date: "2026-08-11", pagesRead: 4, readingDay: logicalDay }]);
  });
});
