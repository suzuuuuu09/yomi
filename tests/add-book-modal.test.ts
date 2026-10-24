import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import AddBookModal from "@/components/sections/AddBookModal";

const state = vi.hoisted(() => ({
  isSubmitting: true,
  reset: vi.fn(),
  close: undefined as (() => void) | undefined,
}));

vi.mock("@/hooks/useAddBook", () => ({
  useAddBook: () => ({
    store: { mode: "manual", reset: state.reset },
    form: { title: "保存中の本", author: "", pages: "", isbn: "", genre: "" },
    setField: vi.fn(),
    handleSubmit: vi.fn(),
    canSubmit: true,
    isSubmitting: state.isSubmitting,
  }),
}));
vi.mock("@/components/shares/modal/Modal", () => ({
  default: ({
    onClose,
    children,
  }: {
    onClose: () => void;
    children: ReactNode;
  }) => {
    state.close = onClose;
    return children;
  },
}));
vi.mock("@/components/shares/card/FeatureCard", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

it("blocks editing and closing during registration, then permits retry after failure", () => {
  const onClose = vi.fn();
  const render = () =>
    renderToStaticMarkup(
      createElement(AddBookModal, {
        isOpen: true,
        onCloseAction: onClose,
        onAddAction: async () => false,
      }),
    );
  state.isSubmitting = true;
  const pendingHtml = render();
  expect(pendingHtml).toMatch(
    /<fieldset[^>]*disabled=""[^>]*inert=""[^>]*aria-busy="true"/,
  );
  state.close?.();
  expect(onClose).not.toHaveBeenCalled();
  expect(state.reset).not.toHaveBeenCalled();

  state.isSubmitting = false;
  const retryHtml = render();
  expect(retryHtml).toMatch(/<fieldset aria-busy="false"/);
  expect(retryHtml).toContain('value="保存中の本"');
  state.close?.();
  expect(onClose).toHaveBeenCalledOnce();
});
