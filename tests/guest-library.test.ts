import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { exportGuestBackup, restoreGuestBackup } from "@/lib/guest-library";
import { startAccountMode, startGuestMode } from "@/lib/library-mode";
import useLibraryStore from "@/store/useLibraryStore";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: (_name: string, action: () => unknown) => {
        const operation = queue.then(action);
        queue = operation.then(
          () => undefined,
          () => undefined,
        );
        return operation;
      },
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("unexpected network");
    }),
  );
});

afterEach(() => {
  useLibraryStore.setState(useLibraryStore.getInitialState());
  vi.unstubAllGlobals();
});

it("ゲストの本は再読み込みしても残り、蔵書APIへ送信しない", async () => {
  startGuestMode();
  await useLibraryStore.getState().fetchBooks();
  expect(
    await useLibraryStore
      .getState()
      .addBook({ title: "端末の本", totalPages: 100 }),
  ).toBe(true);
  useLibraryStore.setState(useLibraryStore.getInitialState());
  await useLibraryStore.getState().fetchBooks();
  expect(useLibraryStore.getState().books).toMatchObject([
    { title: "端末の本" },
  ]);
  expect(fetch).not.toHaveBeenCalled();
});

it("進捗を戻すと当日のログを補正し、メモとアーカイブもバックアップに残す", async () => {
  startGuestMode();
  const store = useLibraryStore.getState();
  await store.addBook({ title: "読書", totalPages: 100 });
  const id = useLibraryStore.getState().books[0].id;
  await store.setPageProgress(id, 30);
  await store.setPageProgress(id, 20);
  await store.addNote(id, "残すメモ", 10);
  await store.archiveBook(id);
  const backup = await exportGuestBackup();
  await store.permanentlyDeleteBook(id);
  await restoreGuestBackup(backup);
  await store.fetchArchivedBooks();
  await store.fetchReadingLogs(id);
  expect(useLibraryStore.getState().archivedBooks).toMatchObject([
    { currentPage: 20, notes: [{ content: "残すメモ" }] },
  ]);
  expect(useLibraryStore.getState().readingLogsByBookId[id]).toMatchObject([
    { pagesRead: 20 },
  ]);
});

it("不正なバックアップと保存容量不足では現在の記録を失わない", async () => {
  startGuestMode();
  await useLibraryStore.getState().addBook({ title: "保持する本" });
  const before = await exportGuestBackup();
  await expect(restoreGuestBackup('{"version":99}')).rejects.toThrow();
  expect(await exportGuestBackup()).toBe(before);
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("quota");
  };
  expect(
    await useLibraryStore.getState().addBook({ title: "保存できない本" }),
  ).toBe(false);
  localStorage.setItem = originalSetItem;
  expect(await exportGuestBackup()).toBe(before);
  expect(useLibraryStore.getState().books).toHaveLength(1);
});

it("保存内容が壊れていても有効なバックアップから復元できる", async () => {
  startGuestMode();
  await useLibraryStore.getState().addBook({ title: "復旧する本" });
  const backup = await exportGuestBackup();
  localStorage.setItem("yomi:guest-library:v1", "broken");
  await restoreGuestBackup(backup);
  await useLibraryStore.getState().fetchBooks();
  expect(useLibraryStore.getState().books[0].title).toBe("復旧する本");
});

it("タイムゾーンの変更前後でも同じ論理読書日を保持する", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-30T00:30:00Z"));
  try {
    startGuestMode();
    const store = useLibraryStore.getState();
    await store.setReadingTimezone("Asia/Tokyo");
    await store.addBook({ title: "時差", totalPages: 100 });
    const id = useLibraryStore.getState().books[0].id;
    await store.setPageProgress(id, 20);
    await store.setReadingTimezone("America/Los_Angeles");
    await store.setPageProgress(id, 30);
    await store.fetchReadingLogs(id);
    const logs = useLibraryStore.getState().readingLogsByBookId[id];
    expect(logs.map((log) => log.date)).toEqual(["2026-10-30", "2026-10-29"]);
    expect(logs[0].readingDay).toBe(logs[1].readingDay);
    await store.fetchReadingStats();
    expect(useLibraryStore.getState().readingStats.days.at(-1)?.pagesRead).toBe(
      30,
    );
    await store.setPageProgress(id, 15);
    await store.fetchReadingLogs(id);
    expect(useLibraryStore.getState().readingLogsByBookId[id]).toMatchObject([
      { pagesRead: 15 },
    ]);
  } finally {
    vi.useRealTimers();
  }
});

it("読書ログの訂正・削除は現在の進捗を変えない", async () => {
  startGuestMode();
  const store = useLibraryStore.getState();
  await store.addBook({ title: "訂正", totalPages: 100 });
  const id = useLibraryStore.getState().books[0].id;
  await store.setPageProgress(id, 20);
  await store.fetchReadingLogs(id);
  const log = useLibraryStore.getState().readingLogsByBookId[id][0];
  await store.updateReadingLog(
    id,
    log.date,
    7,
    log.readingDay,
    log.readingTimezoneRevision,
  );
  expect(useLibraryStore.getState().books[0].currentPage).toBe(20);
  expect(useLibraryStore.getState().readingLogsByBookId[id][0].pagesRead).toBe(
    7,
  );
  await store.deleteReadingLog(
    id,
    log.date,
    log.readingDay,
    log.readingTimezoneRevision,
  );
  expect(useLibraryStore.getState().readingLogsByBookId[id]).toEqual([]);
  expect(useLibraryStore.getState().books[0].currentPage).toBe(20);
});

it("アカウントの通信失敗をゲスト保存へ切り替えない", async () => {
  startGuestMode();
  await useLibraryStore.getState().addBook({ title: "端末だけの本" });
  const before = await exportGuestBackup();
  startAccountMode();
  useLibraryStore.setState(useLibraryStore.getInitialState());
  expect(
    await useLibraryStore.getState().addBook({ title: "通信できない本" }),
  ).toBe(false);
  expect(await exportGuestBackup()).toBe(before);
  expect(useLibraryStore.getState().books).toEqual([]);
});

it("ブラウザー保存が拒否されてもクラウドの蔵書を取得できる", async () => {
  vi.resetModules();
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new Error("storage denied");
    },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: RequestInfo | URL) =>
        new Response(
          JSON.stringify(
            String(input) === "/api/books"
              ? { books: [], constellationLines: [] }
              : { readingTimezone: "UTC", days: [], streak: 0 },
          ),
        ),
    ),
  );
  const freshStore = (await import("@/store/useLibraryStore")).default;
  await freshStore.getState().fetchBooks();
  expect(freshStore.getState().lastError).toBeNull();
  expect(fetch).toHaveBeenCalled();
});
