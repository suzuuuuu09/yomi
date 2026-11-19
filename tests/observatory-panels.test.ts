import { beforeEach, expect, it } from "vitest";
import useBookListStore, {
  type ObservatoryPanel,
} from "@/store/useBookListStore";

beforeEach(() => useBookListStore.getState().setPanel(null));

it("replaces the previous operation panel when another is opened", () => {
  const panels: ObservatoryPanel[] = [
    "list",
    "search",
    "settings",
    "add",
    "progress",
    "edit",
    "delete",
  ];
  for (const previous of panels) {
    for (const next of panels) {
      const ui = useBookListStore.getState();
      ui.setPanel(previous);
      ui.setPanel(next);
      expect(useBookListStore.getState().activePanel).toBe(next);
      expect(useBookListStore.getState().isOpen).toBe(next === "list");
      if (previous !== next) {
        ui.closePanel(previous);
        expect(useBookListStore.getState().activePanel).toBe(next);
      }
    }
  }
});

it("keeps list actions exclusive without closing a newer panel", () => {
  const ui = useBookListStore.getState();
  ui.setPanel("progress");
  ui.open();
  expect(useBookListStore.getState().activePanel).toBe("list");
  ui.toggle();
  expect(useBookListStore.getState().activePanel).toBeNull();
  ui.toggle();
  expect(useBookListStore.getState().isOpen).toBe(true);
  ui.setPanel("edit");
  ui.close();
  expect(useBookListStore.getState().activePanel).toBe("edit");
});
