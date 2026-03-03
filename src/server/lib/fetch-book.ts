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

  const res = await fetch(`${baseUrl}?${params.toString()}`);
  return res.json();
};
