export async function register() {
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_RUNTIME !== "edge"
  ) {
    try {
      const { setupDevPlatform } = (await new Function(
        'return import("@cloudflare/next-on-pages/next-dev")',
      )()) as typeof import("@cloudflare/next-on-pages/next-dev");
      await setupDevPlatform();
    } catch {
      console.warn("[dev] @cloudflare/next-on-pages/next-devが読み込めません");
    }
  }
}
