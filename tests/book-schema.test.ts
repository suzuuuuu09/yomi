import { describe, expect, it } from "vitest";
import {
  CreateBookSchema,
  NoteCreateSchema,
  ProgressUpdateSchema,
  UpdateBookSchema,
} from "@/server/schemas/books";

describe("book request schemas", () => {
  it("accepts a valid book and applies safe defaults", () => {
    const result = CreateBookSchema.safeParse({ title: "本のタイトル" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.author).toBe("");
      expect(result.data.currentPage).toBe(0);
      expect(result.data.totalPages).toBe(0);
    }
  });

  it("rejects invalid titles, numeric strings, and impossible progress", () => {
    expect(CreateBookSchema.safeParse({ title: "   " }).success).toBe(false);
    expect(
      CreateBookSchema.safeParse({ title: "本", totalPages: "100" }).success,
    ).toBe(false);
    expect(
      CreateBookSchema.safeParse({
        title: "本",
        totalPages: 100,
        currentPage: 101,
      }).success,
    ).toBe(false);
  });

  it("requires a meaningful partial update", () => {
    expect(UpdateBookSchema.safeParse({}).success).toBe(false);
    expect(UpdateBookSchema.safeParse({ title: "更新後" }).success).toBe(true);
  });

  it("validates note content and optional page", () => {
    expect(
      NoteCreateSchema.safeParse({ content: "メモ", page: null }).success,
    ).toBe(true);
    expect(NoteCreateSchema.safeParse({ content: "   " }).success).toBe(false);
    expect(
      NoteCreateSchema.safeParse({ content: "メモ", page: 0 }).success,
    ).toBe(false);
  });

  it("accepts exactly one progress operation", () => {
    expect(ProgressUpdateSchema.safeParse({ delta: 1 }).success).toBe(true);
    expect(ProgressUpdateSchema.safeParse({ page: 10 }).success).toBe(true);
    expect(ProgressUpdateSchema.safeParse({}).success).toBe(false);
    expect(ProgressUpdateSchema.safeParse({ delta: 1, page: 10 }).success).toBe(
      false,
    );
  });
});
