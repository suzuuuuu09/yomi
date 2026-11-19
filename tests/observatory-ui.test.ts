import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import ObservatoryEmptyState from "@/components/sections/ObservatoryEmptyState";

it("gives an empty library one clear action to register its first book", () => {
  const html = renderToStaticMarkup(
    createElement(ObservatoryEmptyState, { onAdd: vi.fn() }),
  );
  expect(html).toContain("あなたの宇宙は、ここから始まる。");
  expect(html).toContain("最初の本を登録して、自分だけの星空を作ろう。");
  expect(html).toMatch(
    /<button[^>]*type="button"[^>]*>[\s\S]*最初の星を生み出す/,
  );
  expect(html.match(/<button\b/g)).toHaveLength(1);
});

it("prioritizes recording progress while keeping notes, editing and history available", async () => {
  const { default: StarInsightPanel } = await import(
    "@/components/StarInsightPanel"
  );
  const html = renderToStaticMarkup(
    createElement(StarInsightPanel, {
      book: {
        id: "prince",
        title: "星の王子さま",
        author: "サン＝テグジュペリ",
        isbn: "",
        totalPages: 240,
        currentPage: 168,
        status: "reading",
        genre: "文学",
        coverUrl: "",
        registeredAt: "2026-10-01T00:00:00Z",
        completedAt: null,
        archivedAt: null,
        position: [0, 0, 0],
        brightness: 0.7,
        color: "#a5b4fc",
        notes: [],
      },
      onClose: vi.fn(),
      onUpdateBook: vi.fn(),
      onPageUpdate: vi.fn(),
      onPageSet: vi.fn(),
      onAddNote: async () => false,
      onDeleteNote: vi.fn(),
      onArchiveBook: vi.fn(),
      onPermanentlyDeleteBook: vi.fn(),
      readingStats: { days: [], streak: 0, readingTimezone: "Asia/Tokyo" },
      readingLogs: [],
      onUpdateReadingLog: vi.fn(),
      onDeleteReadingLog: vi.fn(),
    }),
  );
  expect(html).toContain('aria-label="読書進捗"');
  expect(html).toContain('value="70"');
  expect(html).toContain("168 / 240");
  expect(html).toContain('aria-controls="reading-progress-controls"');
  expect(html.indexOf("読書を記録する")).toBeLessThan(
    html.indexOf('aria-controls="reading-notes"'),
  );
  expect(html).not.toContain('id="reading-progress-controls"');
  expect(html).toMatch(/id="reading-notes" hidden=""/);
  expect(html).toContain("読書の記録・書籍情報");
  expect(html).toContain("この本をアーカイブ");
});
