import { ChevronRight } from "lucide-react";
import Image from "next/image";
import { sva } from "styled-system/css";
import type { BookSearchResult } from "@/types/book-search";

const COVER_FALLBACK = "/images/book-cover-fallback.png";

interface SearchResultItemProps {
  book: BookSearchResult;
  isSelected?: boolean;
  onSelect: (b: BookSearchResult) => void;
}

const searchResultItemStyles = sva({
  slots: ["button", "thumbnail", "info", "title", "authors", "meta", "chevron"],
  base: {
    button: {
      w: "full",
      minH: "100px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      p: "10px 12px",
      border: "1px solid transparent",
      rounded: "8px",
      bg: "#071033",
      textAlign: "left",
      cursor: "pointer",
      transition: "colors",
      _hover: { bg: "#0c1842" },
      _focusVisible: {
        outline: "2px solid #c4b5fd",
        outlineOffset: "2px",
      },
    },
    thumbnail: {
      w: "56px",
      h: "80px",
      bg: "whiteAlpha.10",
      rounded: "4px",
      overflow: "hidden",
      flexShrink: 0,
    },
    info: {
      flex: 1,
      minW: 0,
    },
    title: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#f2f2ff",
      lineHeight: 1.35,
      truncate: true,
    },
    authors: {
      mt: "2px",
      fontSize: "14px",
      color: "#b9bce6",
      lineHeight: 1.4,
      truncate: true,
    },
    meta: {
      mt: "2px",
      fontSize: "13px",
      color: "#8f93c7",
      lineHeight: 1.4,
      truncate: true,
    },
    chevron: {
      flexShrink: 0,
      color: "#c7c8ef",
    },
  },
});

export const SearchResultItem = (props: SearchResultItemProps) => {
  const { book, isSelected, onSelect } = props;
  const styles = searchResultItemStyles();
  const meta = [book.publisher, book.publishedDate].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className={styles.button}
      aria-pressed={Boolean(isSelected)}
      style={
        isSelected
          ? {
              background: "rgba(124, 92, 240, 0.16)",
              border: "1px solid #9b8cff",
              boxShadow: "0 0 18px rgba(124, 92, 240, 0.25)",
            }
          : undefined
      }
    >
      <div className={styles.thumbnail}>
        <Image
          src={
            book.thumbnail
              ? book.thumbnail.replace("http://", "https://")
              : COVER_FALLBACK
          }
          width={56}
          height={80}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div className={styles.info}>
        <p className={styles.title}>{book.title}</p>
        <p className={styles.authors}>{book.authors?.join(", ")}</p>
        {meta && <p className={styles.meta}>{meta}</p>}
      </div>
      <ChevronRight size={18} className={styles.chevron} aria-hidden="true" />
    </button>
  );
};
