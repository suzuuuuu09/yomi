export class BookProviderError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Google Books returned HTTP ${status}`);
    this.name = "BookProviderError";
    this.status = status;
  }
}

export class BookProviderTimeoutError extends Error {
  constructor() {
    super("Google Books request timed out");
    this.name = "BookProviderTimeoutError";
  }
}

/**
 * @param query - 検索フリーワード
 * @param index - 検索結果の開始位置
 * @param results - 検索結果の最大件数
 * @param apiKey - Google Books APIのAPIキー
 * @returns Google Books APIのレスポンスデータ
 * @description Google Books APIを使用して本の情報を取得する。
 */
export const fetchBookData = async (
  query: string,
  index: number,
  results: number,
  apiKey: string,
) => {
  const baseUrl = "https://www.googleapis.com/books/v1/volumes";
  const params = new URLSearchParams({
    q: query,
    startIndex: index.toString(),
    maxResults: results.toString(),
    key: apiKey,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`${baseUrl}?${params.toString()}`, {
      signal: controller.signal,
    });

    if (!res.ok) throw new BookProviderError(res.status);
    return await res.json();
  } catch (error) {
    if (controller.signal.aborted) throw new BookProviderTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
