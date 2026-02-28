export const CACHE_CONFIG = {
	SEARCH_BOOKS: {
		cacheName: "book-search",
		cacheControl: `public, max-age=${60 * 60 * 24 * 7}`, // 7日間キャッシュ
	},
};
