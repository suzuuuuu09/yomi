"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import type { IconName } from "lucide-react/dynamic";
import { css } from "styled-system/css";
import { Box, Flex, Stack, styled as s } from "styled-system/jsx";
import { SearchResultItem } from "@/components/SearchResultItem";
import Modal from "@/components/shares/modal/Modal";
import { useAddBook } from "@/hooks/useAddBook";
import type { BookSearchMode, BookInfoValues } from "@/types/book-search";
import type { Book } from "@/types/library";
import TextInput from "~liftkit/text-input";
import { ModeButton } from "./ModeButton";
import BookInfoFields from "@/components/shares/field/BookInfoFields";
import FeatureCard from "@/components/shares/card/FeatureCard";

const MODES: { mode: BookSearchMode; label: string; icon: IconName }[] = [
  { mode: "search", label: "キーワード検索", icon: "search" },
  { mode: "isbn", label: "ISBN検索", icon: "book-open" },
  { mode: "manual", label: "手動入力", icon: "pencil" },
];

interface AddBlockModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onAddAction: (book: Partial<Book>) => void;
}

export default function AddBookModal(props: AddBlockModalProps) {
  const { isOpen, onCloseAction, onAddAction } = props;
  const { store, form, setField, handleSelectResult, handleSubmit, canSubmit } =
    useAddBook(onAddAction, onCloseAction);

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setField(field)({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const totalPages = Math.ceil(Math.min(store.totalItems, 100) / 20);

  return (
    <Modal isOpen={isOpen} onClose={onCloseAction}>
      <FeatureCard
        title="新しい星を生む"
        description="本を登録して宇宙に星を追加"
        icon="sparkles"
        onCloseAction={onCloseAction}
      >
        <Flex
          gap={1}
          mb={6}
          rounded="2xl"
          bg="indigo.500/8"
          border="1px solid"
          borderColor="indigo.500/25"
          style={{ padding: "4px" }}
        >
          {MODES.map(({ mode, label, icon }) => (
            <ModeButton
              key={mode}
              mode={mode}
              current={store.mode}
              onClick={store.setMode}
              icon={icon}
              label={label}
            />
          ))}
        </Flex>

        {store.mode === "manual" ? (
          <BookInfoFields
            values={{
              title: form.title,
              author: form.author,
              pages: form.pages,
              isbn: form.isbn,
              genre: form.genre,
            }}
            onChange={
              handleFormChange as (
                field: keyof BookInfoValues,
                value: string,
              ) => void
            }
          />
        ) : (
          <Stack dir="column">
            <Flex align="flex-end" gap={2}>
              <Box flex={1}>
                <TextInput
                  name={
                    store.mode === "isbn" ? "ISBNで検索" : "キーワードで検索"
                  }
                  placeholder={
                    store.mode === "isbn" ? "978..." : "タイトルや著者名で検索"
                  }
                  value={store.query}
                  onChange={(e) => store.setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && store.fetchPage(0)}
                />
              </Box>
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
                  <Loader2 size={16} className={css({ animation: "spin" })} />
                ) : (
                  <Search size={16} />
                )}
              </s.button>
            </Flex>

            <Box mt={4} overflowY="auto" maxH="28vh" minH="120px">
              {!store.isSearching &&
                store.searchResults.map((book) => (
                  <SearchResultItem
                    key={book.id}
                    book={book}
                    isSelected={store.selectedResult?.id === book.id}
                    onSelect={handleSelectResult}
                  />
                ))}
            </Box>

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

            {/* ジャンルのセレクターのみ */}
            <BookInfoFields
              genreOnly
              values={{
                title: "",
                author: "",
                pages: "",
                isbn: "",
                genre: form.genre,
              }}
              onChange={(field, value) =>
                field === "genre" && handleFormChange("genre", value)
              }
            />
          </Stack>
        )}

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
          _disabled={{
            opacity: 0.3,
            cursor: "not-allowed",
          }}
        >
          星を誕生させる
        </s.button>
      </FeatureCard>
    </Modal>
  );
}
