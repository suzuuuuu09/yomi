import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { apiError } from "@/server/lib/api-error";
import {
  BookProviderError,
  BookProviderTimeoutError,
  fetchBookData,
} from "@/server/lib/fetch-book";
import { authMiddleware } from "@/server/middleware/auth";
import {
  BookResponseSchema,
  FinalResponseSchema,
  SearchErrorSchema,
  SearchQuerySchema,
} from "@/server/schemas/search";

function invalidRequest(
  c: Parameters<typeof apiError>[0],
  error: { issues: { path: PropertyKey[]; message: string }[] },
) {
  return apiError(
    c,
    400,
    "INVALID_REQUEST",
    "入力値が不正です",
    error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: issue.message,
    })),
  );
}

const searchApp = new OpenAPIHono({
  defaultHook: (result, c) => {
    if (!result.success) return invalidRequest(c, result.error);
  },
});

searchApp.use("/*", authMiddleware);

const searchRoute = createRoute({
  method: "get",
  path: "",
  request: {
    query: SearchQuerySchema,
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: FinalResponseSchema,
        },
      },
      description: `
			本の情報を取得します。
			qパラメータで検索ワードを指定するか，isbnパラメータでISBNコードを指定してください。
			qとisbnの両方が指定された場合は，isbnが優先されます。
			indexパラメータで検索結果の開始位置を指定できます。デフォルトは0です。
			resultsパラメータで検索結果の最大件数を指定できます。デフォルトは10で，最大は40です。
      `,
    },
    400: {
      content: {
        "application/json": {
          schema: SearchErrorSchema,
        },
      },
      description: "検索条件が不正です。",
    },
    401: {
      content: {
        "application/json": {
          schema: SearchErrorSchema,
        },
      },
      description: "認証が必要です。",
    },
    502: {
      content: {
        "application/json": {
          schema: SearchErrorSchema,
        },
      },
      description: "Google Books APIから結果を取得できませんでした。",
    },
    504: {
      content: {
        "application/json": {
          schema: SearchErrorSchema,
        },
      },
      description: "Google Books APIがタイムアウトしました。",
    },
  },
});

searchApp.openapi(searchRoute, async (c) => {
  const { q, isbn, index, results } = c.req.valid("query");
  const apiKey = process.env.GOOGLE_API_KEY ?? "";

  const searchQuery = isbn ? `isbn:${isbn}` : q || "";
  let rawData: unknown;
  try {
    rawData = await fetchBookData(searchQuery, index, results, apiKey);
  } catch (error) {
    if (error instanceof BookProviderTimeoutError) {
      return c.json(
        {
          error: {
            code: "UPSTREAM_TIMEOUT",
            message: "検索サービスがタイムアウトしました",
          },
        },
        504 as const,
      );
    }

    if (error instanceof BookProviderError) {
      console.error("Google Books request failed", error);
    } else {
      console.error("Google Books response could not be read", error);
    }

    return c.json(
      {
        error: {
          code: "UPSTREAM_ERROR",
          message: "検索サービスから結果を取得できませんでした",
        },
      },
      502 as const,
    );
  }

  const parsed = BookResponseSchema.safeParse(rawData);

  if (!parsed.success) {
    return c.json(
      {
        error: {
          code: "UPSTREAM_ERROR",
          message: "検索サービスの応答形式が不正です",
        },
      },
      502 as const,
    );
  }

  // Google Books APIのレスポンスから必要な情報を抽出して整形
  const books = parsed.data.items?.map((item) => {
    const info = item.volumeInfo;

    // ISBN13を優先的に取得
    const isbn13 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_13",
    )?.identifier;
    const isbn10 = info.industryIdentifiers?.find(
      (id) => id.type === "ISBN_10",
    )?.identifier;

    const thumbnail =
      info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

    return {
      id: item.id,
      title: info.title,
      authors: info.authors ?? [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      description: info.description,
      isbn: isbn13 || isbn10 || null,
      page: info.pageCount,
      thumbnail,
    };
  });

  return c.json(
    {
      totalItems: parsed.data.totalItems,
      books: books,
    },
    200 as const,
  );
});

export default searchApp;
