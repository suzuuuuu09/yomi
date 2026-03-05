import { css } from "styled-system/css";
import { Box, styled as s } from "styled-system/jsx";
import Column from "~liftkit/column";
import Grid from "~liftkit/grid";
import {
  Select,
  SelectMenu,
  SelectOption,
  SelectTrigger,
} from "~liftkit/select";
import TextInput from "~liftkit/text-input";
import Text from "~liftkit/text";
import { GENRES } from "@/consts/genre";
import type { BookInfoValues } from "@/types/book-search";

interface BookInfoFormProps {
  values: BookInfoValues;
  onChange: (field: keyof BookInfoValues, value: string) => void;
  genreOnly?: boolean;
}

export default function BookInfoFields(props: BookInfoFormProps) {
  const { values, onChange, genreOnly = false } = props;

  return (
    <Column gap="md">
      {!genreOnly && (
        <>
          <TextInput
            name="タイトル"
            placeholder="本のタイトル"
            endIcon="book-open"
            value={values.title}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <Grid gap="md" className={css({ gridTemplateColumns: 2 })}>
            <TextInput
              name="著者"
              placeholder="著者名"
              endIcon="user"
              value={values.author}
              onChange={(e) => onChange("author", e.target.value)}
            />
            <TextInput
              name="ページ数"
              placeholder="320"
              endIcon="file-text"
              type="number"
              value={values.pages}
              onChange={(e) => onChange("pages", e.target.value)}
            />
          </Grid>
          <TextInput
            name="ISBN（任意）"
            placeholder="978..."
            maxLength={13} // ISBN-13の最大文字数は13
            endIcon="barcode"
            value={values.isbn}
            onChange={(e) => onChange("isbn", e.target.value)}
          />
        </>
      )}
      <Box>
        <Text
          tag="p"
          fontClass="caption"
          className={css({ color: "slate.400", mb: 1.5 })}
        >
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
            <s.button
              type="button"
              w="full"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              px={4}
              py={3}
              rounded="xl"
              bg="whiteAlpha.5"
              border="1px solid"
              borderColor="whiteAlpha.10"
              fontSize="sm"
              cursor="pointer"
            >
              {GENRES.find(({ id }) => id === values.genre)?.label ??
                "選択してください"}
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
      </Box>
    </Column>
  );
}
