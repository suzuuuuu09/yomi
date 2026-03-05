interface Genre {
  id: string;
  label: string;
}

export const GENRES: Genre[] = [
  { id: "literature", label: "文学" },
  { id: "sf", label: "SF" },
  { id: "science", label: "科学" },
  { id: "history", label: "歴史" },
  { id: "social_science", label: "社会科学" },
  { id: "business", label: "ビジネス" },
  { id: "other", label: "その他" },
];
