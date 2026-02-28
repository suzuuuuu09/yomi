"use client";

import Image from "next/image";
import type { IconName } from "lucide-react/dynamic";
import {
  useBookSearchStore,
  type BookSearchMode,
} from "@/store/useBookSearchStore";
import type { BookSearchResult } from "@/lib/api";
import type { Book } from "@/lib/types";
import Badge from "~liftkit/badge";
import Card from "~liftkit/card";
import Column from "~liftkit/column";
import Grid from "~liftkit/grid";
import Heading from "~liftkit/heading";
import {
  Select,
  SelectMenu,
  SelectOption,
  SelectTrigger,
} from "~liftkit/select";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from "lucide-react";
import { useState } from "react";
import { css } from "styled-system/css";
import { Flex, Stack, styled as s } from "styled-system/jsx";
import IconButton from "./liftkit/icon-button";
import Button from "~liftkit/button";

const GENRES = ["文学", "SF", "科学", "歴史", "社会科学", "ビジネス", "その他"];

interface ModeButtonProps {
  mode: BookSearchMode;
  current: BookSearchMode;
  onClick: (mode: BookSearchMode) => void;
  icon: IconName;
  label: string;
}

const ModeButton = ({ mode, current, onClick, icon, label }: ModeButtonProps) => {
  const isSelected = current === mode;
  return (
    <s.div
      flex={1}
      display="flex"
      style={
        isSelected
          ? { filter: "drop-shadow(0 0 10px rgba(99,102,241,0.55))" }
          : undefined
      }
    >
      <Button
        label={label}
        startIcon={icon}
        variant={isSelected ? "fill" : "text"}
        color={isSelected ? "primarycontainer" : "surfacevariant"}
        size="sm"
        onClick={() => onClick(mode)}
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: isSelected ? 1 : 0.5,
          transition: "all 0.2s ease",
        }}
      />
    </s.div>
  );
};

const SearchResultItem = ({
  book,
  onSelect,
}: {
  book: BookSearchResult;
  onSelect: (b: BookSearchResult) => void;
}) => (
  <s.button
    type="button"
    onClick={() => onSelect(book)}
    w="full"
    display="flex"
    alignItems="start"
    gap={3}
    p={2}
    rounded="xl"
    textAlign="left"
    cursor="pointer"
    transition="colors"
    _hover={{ bg: "whiteAlpha.5" }}
  >
    <s.div
      w={10}
      h={14}
      bg="whiteAlpha.10"
      rounded="sm"
      overflow="hidden"
      flexShrink={0}
    >
      {book.thumbnail && (
        <Image
          src={book.thumbnail.replace("http://", "https://")}
          width={80}
          height={112}
          alt={book.title}
        />
      )}
    </s.div>
    <s.div flex={1} minW={0}>
      <s.p fontSize="sm" fontWeight="medium" color="slate.200" truncate={true}>
        {book.title}
      </s.p>
      <s.p fontSize="11px" color="slate.500" truncate={true}>
        {book.authors?.join(", ")}
      </s.p>
    </s.div>
  </s.button>
);

export default function AddBookModal({
  isOpen,
  onCloseAction,
  onAddAction,
}: {
  isOpen: boolean;
  onCloseAction: () => void;
  onAddAction: (book: Partial<Book>) => void;
}) {
  const store = useBookSearchStore();

  const [form, setForm] = useState({
    title: "",
    author: "",
    pages: "",
    genre: "",
    isbn: "",
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const handleSelectResult = (book: BookSearchResult) => {
    store.setSelectedResult(book);
    setForm({
      title: book.title,
      author: book.authors?.join(", ") || "",
      pages: book.page ? String(book.page) : "",
      isbn: book.isbn || "",
      genre: form.genre,
    });
  };

  const handleSubmit = () => {
    const finalTitle = store.selectedResult?.title || form.title;
    if (!finalTitle) return;

    onAddAction({
      title: finalTitle,
      author: store.selectedResult?.authors?.join(", ") || form.author,
      isbn: form.isbn || store.selectedResult?.isbn || "",
      totalPages:
        store.selectedResult?.page || Number.parseInt(form.pages, 10) || 0,
      genre: form.genre,
      coverUrl:
        store.selectedResult?.thumbnail?.replace("http://", "https://") || "",
      currentPage: 0,
      status: "unread",
    });

    setForm({ title: "", author: "", pages: "", genre: "", isbn: "" });
    store.reset();
    onCloseAction();
  };

  const totalPages = Math.ceil(Math.min(store.totalItems, 100) / 20);
  const canSubmit =
    store.mode === "manual" ? !!form.title : !!store.selectedResult;

  return (
    <s.div
      position="fixed"
      inset={0}
      zIndex={50}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
    >
      <s.button
        type="button"
        position="absolute"
        inset={0}
        bg="blackAlpha.60"
        backdropBlur="sm"
        w="full"
        h="full"
        border="none"
        cursor="pointer"
        onClick={onCloseAction}
        className={css({ animation: "fadeIn 0.2s ease-out" })}
      />

      <s.div
        position="relative"
        w="full"
        maxW="lg"
        maxH="90vh"
        overflowY="auto"
        className={css({
          animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        })}
      >
        <Card
          material="glass"
          variant="outline"
          scaleFactor="body"
          className={css({ boxShadow: "2xl" })}
        >
          <IconButton
            icon="x"
            variant="text"
            onClick={onCloseAction}
            className={css({
              position: "absolute!",
              top: "4!",
              right: "4!",
              zIndex: 10,
              "& svg": {
                color: "slate.400!",
              },
              _hover: {
                "& svg": {
                  color: "white!",
                },
              },
            })}
          />

          <s.div p={1}>
            <Flex align="center" gap={3} mb={6}>
              <Badge
                icon="sparkles"
                scale="md"
                className={css({
                  bg: "indigo.500/15",
                  border: "2px solid",
                  borderColor: "indigo.500/20",
                })}
              />
              <s.div>
                <Heading
                  tag="h2"
                  fontClass="title3-bold"
                  className={css({ color: "white" })}
                >
                  新しい星を生む
                </Heading>
                <Text
                  tag="p"
                  fontClass="caption"
                  className={css({ color: "slate.400" })}
                >
                  本を登録して宇宙に星を追加
                </Text>
              </s.div>
            </Flex>

            {/* Mode Selector */}
            <s.div
              display="flex"
              gap={1}
              mb={6}
              rounded="2xl"
              bg="indigo.500/8"
              border="1px solid"
              borderColor="indigo.500/25"
              style={{ padding: "4px" }}
            >
              <ModeButton
                mode="search"
                current={store.mode}
                onClick={store.setMode}
                icon="search"
                label="フリーワード"
              />
              <ModeButton
                mode="isbn"
                current={store.mode}
                onClick={store.setMode}
                icon="book-open"
                label="ISBN検索"
              />
              <ModeButton
                mode="manual"
                current={store.mode}
                onClick={store.setMode}
                icon="pencil"
                label="手動入力"
              />
            </s.div>

            {/* Input Area */}
            {store.mode === "manual" ? (
              <Column gap="md">
                <TextInput
                  placeholder="本のタイトル"
                  name="タイトル"
                  endIcon="book-open"
                  value={form.title}
                  onChange={(e) => updateForm("title", e.target.value)}
                />
                <Grid gap="md" className={css({ gridTemplateColumns: 2 })}>
                  <TextInput
                    name="著者"
                    placeholder="著者名"
                    endIcon="user"
                    value={form.author}
                    onChange={(e) => updateForm("author", e.target.value)}
                  />
                  <TextInput
                    name="ページ数"
                    placeholder="320"
                    endIcon="file-text"
                    type="number"
                    value={form.pages}
                    onChange={(e) => updateForm("pages", e.target.value)}
                  />
                </Grid>
                <TextInput
                  name="ISBN（任意）"
                  placeholder="978..."
                  endIcon="barcode"
                  value={form.isbn}
                  onChange={(e) => updateForm("isbn", e.target.value)}
                />
              </Column>
            ) : (
              <Stack dir="column">
                <Flex align="flex-end" gap={2}>
                  <s.div flex={1}>
                    <TextInput
                      name={
                        store.mode === "isbn"
                          ? "ISBNで検索"
                          : "キーワードで検索"
                      }
                      placeholder={
                        store.mode === "isbn"
                          ? "978..."
                          : "タイトルや著者名で検索"
                      }
                      value={store.query}
                      onChange={(e) => store.setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && store.fetchPage(0)}
                    />
                  </s.div>
                  <s.button
                    type="button"
                    onClick={() => store.fetchPage(0)}
                    disabled={!store.query.trim() || store.isSearching}
                    px={4}
                    h="46px"
                    rounded="xl"
                    bg="indigo.500/20"
                    border="1px solid"
                    borderColor="indigo.500/30"
                    color="indigo.300"
                    _disabled={{ opacity: 0.3 }}
                  >
                    {store.isSearching ? (
                      <Loader2
                        size={16}
                        className={css({ animation: "spin" })}
                      />
                    ) : (
                      <Search size={16} />
                    )}
                  </s.button>
                </Flex>

                <s.div mt={4} overflowY="auto" maxH="28vh" minH="120px">
                  {!store.isSearching &&
                    store.searchResults.map((book) => (
                      <SearchResultItem
                        key={book.id}
                        book={book}
                        onSelect={handleSelectResult}
                      />
                    ))}
                </s.div>

                {/* Pagination */}
                {totalPages > 1 && store.mode !== "isbn" && (
                  <Flex align="center" justify="center" gap={4} mt={2}>
                    <s.button
                      type="button"
                      onClick={() => store.fetchPage(store.currentPage - 1)}
                      disabled={store.currentPage === 0}
                      _disabled={{ opacity: 0.2 }}
                    >
                      <ChevronLeft size={16} />
                    </s.button>
                    <s.span fontSize="xs" color="slate.500">
                      {store.currentPage + 1} / {totalPages}
                    </s.span>
                    <s.button
                      type="button"
                      onClick={() => store.fetchPage(store.currentPage + 1)}
                      disabled={store.currentPage >= totalPages - 1}
                      _disabled={{ opacity: 0.2 }}
                    >
                      <ChevronRight size={16} />
                    </s.button>
                  </Flex>
                )}
              </Stack>
            )}

            {/* Genre & Submit */}
            <s.div mt={4}>
              <Text
                tag="p"
                fontClass="caption"
                className={css({ color: "slate.400", mb: 1.5 })}
              >
                ジャンル
              </Text>
              <Select
                options={GENRES.map((g) => ({ label: g, value: g }))}
                value={form.genre}
                onChange={(e) => updateForm("genre", e.target.value)}
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
                    color="white"
                    cursor="pointer"
                  >
                    {form.genre || "選択してください"}
                  </s.button>
                </SelectTrigger>
                <SelectMenu
                  cardProps={{ scaleFactor: "caption", material: "glass" }}
                >
                  {GENRES.map((g) => (
                    <SelectOption key={g} value={g}>
                      {g}
                    </SelectOption>
                  ))}
                </SelectMenu>
              </Select>
            </s.div>

            <s.button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              mt={6}
              w="full"
              py={3}
              rounded="xl"
              bg="indigo.500/20"
              border="1px solid"
              borderColor="indigo.500/30"
              color="indigo.300"
              fontWeight="semibold"
              cursor="pointer"
              _hover={{ bg: "indigo.500/30" }}
              _disabled={{ opacity: 0.3 }}
            >
              星を誕生させる
            </s.button>
          </s.div>
        </Card>
      </s.div>
    </s.div>
  );
}
