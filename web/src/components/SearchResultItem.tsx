import Image from "next/image";
import { sva } from "styled-system/css";
import type { BookSearchResult } from "@/types/book-search";

interface SearchResultItemProps {
  book: BookSearchResult;
  onSelect: (b: BookSearchResult) => void;
}

const searchResultItemStyles = sva({
  slots: ["button", "thumbnail", "info", "title", "authors"],
  base: {
    button: {
      w: "full",
      display: "flex",
      alignItems: "start",
      gap: 3,
      p: 2,
      rounded: "xl",
      textAlign: "left",
      cursor: "pointer",
      transition: "colors",
      _hover: { bg: "whiteAlpha.5" },
    },
    thumbnail: {
      w: 10,
      h: 14,
      bg: "whiteAlpha.10",
      rounded: "sm",
      overflow: "hidden",
      flexShrink: 0,
    },
    info: {
      flex: 1,
      minW: 0,
    },
    title: {
      fontSize: "sm",
      fontWeight: "medium",
      color: "slate.200",
      truncate: true,
    },
    authors: {
      fontSize: "11px",
      color: "slate.500",
      truncate: true,
    },
  },
});

export const SearchResultItem = (props: SearchResultItemProps) => {
  const { book, onSelect } = props;
  const styles = searchResultItemStyles();
  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className={styles.button}
    >
      <div className={styles.thumbnail}>
        {book.thumbnail && (
          <Image
            src={book.thumbnail.replace("http://", "https://")}
            width={80}
            height={112}
            alt={book.title}
          />
        )}
      </div>
      <div className={styles.info}>
        <p className={styles.title}>{book.title}</p>
        <p className={styles.authors}>{book.authors?.join(", ")}</p>
      </div>
    </button>
  );
};
