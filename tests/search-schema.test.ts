import { describe, expect, it } from "vitest";
import { SearchQuerySchema } from "@/server/schemas/search";

describe("SearchQuerySchema", () => {
  it("accepts a bounded text search", () => {
    const result = SearchQuerySchema.safeParse({
      q: "TypeScript",
      index: "0",
      results: "20",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.index).toBe(0);
      expect(result.data.results).toBe(20);
    }
  });

  it("rejects an empty query and out-of-range pagination", () => {
    const result = SearchQuerySchema.safeParse({
      q: "   ",
      index: "-1",
      results: "41",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an ISBN search without a text query", () => {
    const result = SearchQuerySchema.safeParse({
      isbn: "9784000000000",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a request without either query form", () => {
    const result = SearchQuerySchema.safeParse({});

    expect(result.success).toBe(false);
  });
});
