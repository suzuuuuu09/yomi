import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { cache } from "hono/cache";
import { fetchBookData } from "@/lib/fetch-book";
import {
	BookResponseSchema,
	FinalResponseSchema,
	SearchQuerySchema,
} from "@/schemas/book";
import { CACHE_CONFIG } from "@/config/cache";
import type { Env } from "@/types";

const searchApp = new OpenAPIHono<Env>();

searchApp.use("*", cache(CACHE_CONFIG.SEARCH_BOOKS));

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
	},
});

// ハンドラーの実装
searchApp.openapi(searchRoute, async (c) => {
	const { q, isbn, index, results } = c.req.valid("query");
	const apiKey = c.env.GOOGLE_API_KEY;

	const searchQuery = isbn ? `isbn:${isbn}` : q || "";
	const rawData = await fetchBookData(searchQuery, index, results, apiKey);

	const parsed = BookResponseSchema.safeParse(rawData);

	if (!parsed.success) {
		return c.json({ kind: "error", totalItems: 0 }, 200);
	}

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

	return c.json({
		totalItems: parsed.data.totalItems,
		books: books,
	});
});

export default searchApp;
