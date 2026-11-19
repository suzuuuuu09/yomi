import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { css } from "styled-system/css";
import { styled as s } from "styled-system/jsx";
import { GENRES } from "@/consts/genre";
import type { BookInfoValues } from "@/types/book-search";
import Column from "~liftkit/column";
import Grid from "~liftkit/grid";
import {
  Select,
  SelectMenu,
  SelectOption,
  SelectTrigger,
} from "~liftkit/select";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";

interface BookInfoFormProps {
  values: BookInfoValues;
  onChange: (field: keyof BookInfoValues, value: string) => void;
  genreOnly?: boolean;
  layout?: "stack" | "edit";
  cover?: ReactNode;
}

const fieldWrap = css({
  minWidth: 0,
  "& > [data-lk-component='text-input']": {
    width: "100%",
  },
  "& label": {
    display: "block",
    margin: "0 0 6px",
    color: "#c7c8ef",
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: 1.4,
  },
  "& [data-lk-text-input-el='input-wrap']": {
    height: "40px",
    marginTop: 0,
    overflow: "hidden",
    border: "1px solid #6668bd",
    borderRadius: "8px",
    background: "#0b1438",
    outlineOffset: "2px",
  },
  "& [data-lk-text-input-el='input-wrap']:has(input:focus-visible)": {
    outline: "2px solid #c4b5fd",
    outlineOffset: "2px",
  },
  "& input": {
    width: "100%",
    height: "100%",
    padding: "0 12px",
    border: 0,
    background: "transparent",
    color: "#f4f4ff",
    fontSize: "14px",
  },
  "& input:focus-visible": {
    outline: "none",
  },
  "& input::placeholder": {
    color: "#8589bd",
  },
  "& [data-lk-component='icon']": {
    display: "none",
  },
  "& [data-lk-component='state-layer']": {
    display: "none",
  },
});

const genreLabel = css({
  marginBottom: "6px",
  color: "#c7c8ef",
  fontSize: "12px",
  fontWeight: 500,
  lineHeight: 1.4,
});

const genreTrigger = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  width: "100%",
  height: "40px",
  padding: "0 12px",
  border: "1px solid #6668bd",
  borderRadius: "8px",
  background: "#0b1438",
  color: "#f4f4ff",
  fontSize: "14px",
  cursor: "pointer",
  _hover: { borderColor: "#8f8fe0" },
});

const editGrid = css({
  display: "grid",
  gridTemplateColumns: "140px minmax(0, 1fr)",
  columnGap: "20px",
  rowGap: "14px",
  alignItems: "start",
  "@media (max-width: 767px)": {
    gridTemplateColumns: "1fr",
  },
});

const editCover = css({
  gridColumn: "1",
  gridRow: "1 / span 3",
  minWidth: 0,
  "@media (max-width: 767px)": {
    gridColumn: "1 / -1",
    gridRow: "auto",
    display: "flex",
    justifyContent: "center",
  },
});

const editTitle = css({
  gridColumn: "2",
  gridRow: "1",
  minWidth: 0,
  "@media (max-width: 767px)": {
    gridColumn: "1 / -1",
    gridRow: "auto",
  },
});

const editAuthor = css({
  gridColumn: "2",
  gridRow: "2",
  minWidth: 0,
  "@media (max-width: 767px)": {
    gridColumn: "1 / -1",
    gridRow: "auto",
  },
});

const editPagesGenre = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
  gridColumn: "2",
  gridRow: "3",
  minWidth: 0,
  "@media (max-width: 767px)": {
    gridColumn: "1 / -1",
    gridRow: "auto",
  },
});

const editIsbn = css({
  gridColumn: "1 / -1",
  paddingTop: "14px",
  marginTop: "2px",
  borderTop: "1px solid #8687d240",
});

export default function BookInfoFields(props: BookInfoFormProps) {
  const {
    values,
    onChange,
    genreOnly = false,
    layout = "stack",
    cover,
  } = props;

  const titleField = (
    <div className={fieldWrap}>
      <TextInput
        name="タイトル"
        placeholder="本のタイトル"
        value={values.title}
        onChange={(e) => onChange("title", e.target.value)}
      />
    </div>
  );

  const authorField = (
    <div className={fieldWrap}>
      <TextInput
        name="著者"
        placeholder="著者名"
        value={values.author}
        onChange={(e) => onChange("author", e.target.value)}
      />
    </div>
  );

  const pagesField = (
    <div className={fieldWrap}>
      <TextInput
        name="ページ数"
        placeholder="320"
        type="number"
        value={values.pages}
        onChange={(e) => onChange("pages", e.target.value)}
      />
    </div>
  );

  const isbnField = (
    <div className={fieldWrap}>
      <TextInput
        name="ISBN（任意）"
        placeholder="97..."
        maxLength={13}
        value={values.isbn}
        onChange={(e) => onChange("isbn", e.target.value)}
      />
    </div>
  );

  const genreField = (
    <div>
      <Text tag="p" fontClass="caption" className={genreLabel}>
        ジャンル
      </Text>
      <Select
        options={GENRES.map(({ id, label }) => ({ label, value: id }))}
        value={values.genre}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          onChange("genre", e.target.value)
        }
      >
        <SelectTrigger>
          <s.button type="button" className={genreTrigger}>
            {GENRES.find(({ id }) => id === values.genre)?.label ??
              "選択してください"}
            <ChevronDown size={16} aria-hidden="true" />
          </s.button>
        </SelectTrigger>
        <SelectMenu cardProps={{ scaleFactor: "caption", material: "glass" }}>
          {GENRES.map(({ id, label }) => (
            <SelectOption key={id} value={id}>
              {label}
            </SelectOption>
          ))}
        </SelectMenu>
      </Select>
    </div>
  );

  if (layout === "edit") {
    return (
      <div className={editGrid}>
        {cover ? <div className={editCover}>{cover}</div> : null}
        {!genreOnly && (
          <>
            <div className={editTitle}>{titleField}</div>
            <div className={editAuthor}>{authorField}</div>
            <div className={editPagesGenre}>
              {pagesField}
              {genreField}
            </div>
            <div className={editIsbn}>{isbnField}</div>
          </>
        )}
        {genreOnly && <div className={editIsbn}>{genreField}</div>}
      </div>
    );
  }

  return (
    <Column gap="md">
      {!genreOnly && (
        <>
          {titleField}
          <Grid gap="md" className={css({ gridTemplateColumns: 2 })}>
            {authorField}
            {pagesField}
          </Grid>
          {isbnField}
        </>
      )}
      {genreField}
    </Column>
  );
}
