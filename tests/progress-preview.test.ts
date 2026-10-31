import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampTargetPage,
  PageControls,
  parseTargetPage,
} from "@/components/StarInsightPanel";
import useProgressPreviewStore from "@/store/useProgressPreviewStore";

afterEach(() => {
  useProgressPreviewStore.getState().clearPreview();
});

describe("useProgressPreviewStore", () => {
  it("keeps one ephemeral preview and clears it on demand", () => {
    const store = useProgressPreviewStore.getState();
    store.setPreview("prince", 180);
    expect(useProgressPreviewStore.getState().preview).toEqual({
      bookId: "prince",
      page: 180,
    });

    store.setPreview("prince", 200);
    expect(useProgressPreviewStore.getState().preview).toEqual({
      bookId: "prince",
      page: 200,
    });

    store.clearPreview();
    expect(useProgressPreviewStore.getState().preview).toBeNull();
  });
});

describe("progress target validation", () => {
  it("accepts whole pages within a known total", () => {
    expect(parseTargetPage("168", 240)).toBe(168);
    expect(parseTargetPage(" 240 ", 240)).toBe(240);
    expect(parseTargetPage("00168", 240)).toBe(168);
  });

  it("rejects values that are not whole pages or are outside 0..total", () => {
    expect(parseTargetPage("", 240)).toBeNull();
    expect(parseTargetPage("-1", 240)).toBeNull();
    expect(parseTargetPage("1.5", 240)).toBeNull();
    expect(parseTargetPage("1e2", 240)).toBeNull();
    expect(parseTargetPage("241", 240)).toBeNull();
  });

  it("allows a non-negative page when the total is unknown", () => {
    expect(parseTargetPage("500", 0)).toBe(500);
    expect(parseTargetPage("-1", 0)).toBeNull();
    expect(clampTargetPage(-5, 240)).toBe(0);
    expect(clampTargetPage(300, 240)).toBe(240);
    expect(clampTargetPage(42, 0)).toBe(42);
  });
});

describe("PageControls", () => {
  it("presents the saved progress and an editable target without saving", () => {
    const onSet = vi.fn();
    const onUpdate = vi.fn();
    const html = renderToStaticMarkup(
      createElement(PageControls, {
        bookId: "prince",
        current: 168,
        total: 240,
        onUpdate,
        onSet,
      }),
    );

    expect(html).toContain("現在の進捗");
    expect(html).toContain("168");
    expect(html).toContain("240");
    expect(html).toContain("70%");
    expect(html).toContain('aria-label="記録するページ"');
    expect(html).toContain('aria-label="1ページ戻す"');
    expect(html).toContain('aria-label="1ページ進める"');
    expect(html).toContain("このページまで記録");
    expect(html).toContain("disabled");
    expect(onSet).not.toHaveBeenCalled();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(useProgressPreviewStore.getState().preview).toBeNull();
  });

  it("shows an unknown percentage when the total is zero", () => {
    const html = renderToStaticMarkup(
      createElement(PageControls, {
        bookId: "unknown",
        current: 12,
        total: 0,
        onUpdate: vi.fn(),
        onSet: vi.fn(),
      }),
    );

    expect(html).toContain("ページ数未設定");
    expect(html).toContain("—");
  });
});
