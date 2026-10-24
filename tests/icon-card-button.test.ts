import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { IconCardButton } from "@/components/shares/IconCardButton";

it("renders a labelled native button for keyboard operation", () => {
  const html = renderToStaticMarkup(
    createElement(IconCardButton, {
      icon: "plus",
      label: "本を追加",
      material: "flat",
    }),
  );
  expect(html).toMatch(/^<button\b/);
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-label="本を追加"');
});
