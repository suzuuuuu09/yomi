import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PerspectiveCamera, Vector3 } from "three";
import { expect, it } from "vitest";
import CloseButton from "@/components/shares/CloseButton";
import { getSelectionOffset } from "@/components/universe/CameraSetup";

it("keeps a selected star inside the area beside the operation panel", () => {
  for (const width of [768, 1024, 1440]) {
    for (const listOpen of [false, true]) {
      const camera = new PerspectiveCamera(50, width / 900, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.updateMatrixWorld();
      const [x, y] = getSelectionOffset(width, 900, listOpen);
      camera.setViewOffset(width, 900, x, y, width, 900);
      const point = new Vector3().project(camera);
      const screenX = ((point.x + 1) * width) / 2;
      if (listOpen)
        expect(screenX).toBeGreaterThan(36 + Math.min(465, width * 0.34));
      else expect(screenX).toBeLessThan(width - 28 - Math.min(500, width - 32));
      expect(screenX).toBeGreaterThan(0);
      expect(screenX).toBeLessThan(width);
    }
  }
});

it("keeps a selected star above the mobile bottom sheet", () => {
  const [x, y] = getSelectionOffset(390, 844, false);
  expect(x).toBe(0);
  expect(844 / 2 - y).toBeLessThan(844 * 0.45);
});

it("renders one accessible close button with a static cross icon", () => {
  const html = renderToStaticMarkup(
    createElement(CloseButton, { "aria-label": "設定を閉じる" }),
  );
  expect(html).toContain('type="button"');
  expect(html).toContain('aria-label="設定を閉じる"');
  expect(html).toContain("<svg");
  expect(html).toContain('aria-hidden="true"');
});
