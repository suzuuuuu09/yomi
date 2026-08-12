export interface ReadingLogValue {
  date: string;
  pagesRead: number;
  readingDay?: number | null;
}

export interface ReadingDay {
  date: string;
  pagesRead: number;
  readingDay?: number;
}

const DAY_MS = 86_400_000;

function datePartsFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function isValidTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    datePartsFormatter(value).format();
    return true;
  } catch {
    return false;
  }
}

export function dateInTimeZone(value: string | Date, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid date");

  const parts = datePartsFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  return dateInTimeZone(now, timeZone);
}

export function addCalendarDays(date: string, amount: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid calendar date");
  parsed.setUTCDate(parsed.getUTCDate() + amount);
  return parsed.toISOString().slice(0, 10);
}

/** Convert an ISO calendar date into a timezone-independent day number. */
export function dateToDayNumber(date: string): number {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid calendar date");
  }
  return Math.floor(parsed.getTime() / DAY_MS);
}

export function dayNumberToDate(dayNumber: number): string {
  if (!Number.isInteger(dayNumber)) throw new Error("Invalid day number");
  return new Date(dayNumber * DAY_MS).toISOString().slice(0, 10);
}

export function preserveReadingDayOffset(
  currentOffset: number,
  now: Date,
  currentTimeZone: string,
  nextTimeZone: string,
): number {
  return (
    dateToDayNumber(dateInTimeZone(now, currentTimeZone)) +
    currentOffset -
    dateToDayNumber(dateInTimeZone(now, nextTimeZone))
  );
}

export function listCalendarDays(endDate: string, count: number): string[] {
  if (!Number.isInteger(count) || count < 1) return [];
  return Array.from({ length: count }, (_, index) =>
    addCalendarDays(endDate, index - count + 1),
  );
}

export function aggregateReadingDays(
  logs: ReadingLogValue[],
  dates: string[],
): ReadingDay[] {
  const totals = new Map<string, number>();
  for (const log of logs) {
    if (log.pagesRead <= 0) continue;
    totals.set(log.date, (totals.get(log.date) ?? 0) + log.pagesRead);
  }
  return dates.map((date) => ({
    date,
    pagesRead: totals.get(date) ?? 0,
  }));
}

export function aggregateReadingDayNumbers(
  logs: ReadingLogValue[],
  dayNumbers: number[],
  fallbackDates: Map<number, string> = new Map(),
): ReadingDay[] {
  const totals = new Map<number, number>();
  for (const log of logs) {
    if (log.pagesRead <= 0) continue;
    const dayNumber =
      log.readingDay === null || log.readingDay === undefined
        ? dateToDayNumber(log.date)
        : log.readingDay;
    totals.set(dayNumber, (totals.get(dayNumber) ?? 0) + log.pagesRead);
  }
  return dayNumbers.map((readingDay) => ({
    date: fallbackDates.get(readingDay) ?? dayNumberToDate(readingDay),
    pagesRead: totals.get(readingDay) ?? 0,
    readingDay,
  }));
}

export function calculateReadingStreak(
  readingDates: string[],
  today: string,
): number {
  const dates = new Set(readingDates);
  let cursor = dates.has(today) ? today : addCalendarDays(today, -1);
  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }
  return streak;
}

export function calculateReadingDayStreak(
  readingDays: number[],
  today: number,
): number {
  const days = new Set(readingDays);
  let cursor = days.has(today) ? today : today - 1;
  if (!days.has(cursor)) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor -= 1;
  }
  return streak;
}
