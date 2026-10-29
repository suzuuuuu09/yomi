import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import BookEditModal from "@/components/BookEditModal";

const state = vi.hoisted(() => ({
  variant: undefined as string | undefined,
}));

vi.mock("@/components/shares/modal/Modal", () => ({
  default: ({
    isOpen,
    children,
    variant,
  }: {
    isOpen: boolean;
    children: ReactNode;
    variant?: string;
  }) => {
    state.variant = variant;
    return isOpen ? children : null;
  },
}));

vi.mock("@/hooks/useEditBook", () => ({
  useEditBook: () => ({
    editForm: {
      title: "星の王子さま",
      author: "サン＝テグジュペリ",
      pages: "240",
      isbn: "978",
      genre: "文学",
    },
    handleChange: vi.fn(),
    buildUpdates: () => ({}),
  }),
}));

it("renders an accessible floating edit form with a cover fallback and clear actions", () => {
  const html = renderToStaticMarkup(
    createElement(BookEditModal, {
      isOpen: true,
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
      onCloseAction: vi.fn(),
      onSaveAction: vi.fn(),
    }),
  );

  expect(state.variant).toBe("floating");
  expect(html).toContain('role="dialog"');
  expect(html).not.toContain('aria-modal="true"');
  expect(html).toContain('aria-labelledby="book-edit-title"');
  expect(html).toContain("星の情報を編集");
  expect(html).toContain("book-cover-fallback.png");
  expect(html).toContain('value="星の王子さま"');
  expect(html).toContain("キャンセル");
  expect(html).toContain("保存");
});
