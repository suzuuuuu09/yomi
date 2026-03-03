"use client";

import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import type { IconName } from "lucide-react/dynamic";
import { css } from "styled-system/css";
import { Flex, Stack, styled as s } from "styled-system/jsx";
import { SearchResultItem } from "@/components/SearchResultItem";
import { useAddBook } from "@/hooks/useAddBook";
import type { BookSearchMode } from "@/types/book-search";
import type { Book } from "@/types/library";
import Badge from "~liftkit/badge";
import Card from "~liftkit/card";
import Column from "~liftkit/column";
import Grid from "~liftkit/grid";
import Heading from "~liftkit/heading";
import CloseButton from "@/components/shares/CloseButton";
import {
  Select,
  SelectMenu,
  SelectOption,
  SelectTrigger,
} from "~liftkit/select";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";
import { ModeButton } from "./ModeButton";
import Modal from "@/components/shares/modal/Modal";

const GENRES = ["文学", "SF", "科学", "歴史", "社会科学", "ビジネス", "その他"];

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

const ManualInputForm = () => {
  return (
    <Column gap="md">
      <TextInput
        placeholder="本のタイトル"
        name="タイトル"
        endIcon="book-open"
      />
      <Grid gap="md" className={css({ gridTemplateColumns: 2 })}>
        <TextInput name="著者" placeholder="著者名" endIcon="user" />
        <TextInput
          name="ページ数"
          placeholder="320"
          endIcon="file-text"
          type="number"
        />
      </Grid>
      <TextInput name="ISBN（任意）" placeholder="978..." endIcon="barcode" />
    </Column>
  );
};

export default function AddBookModal(props: AddBlockModalProps) {
  const { isOpen, onCloseAction, onAddAction } = props;
  const { store, form, setField, handleSelectResult, handleSubmit, canSubmit } =
    useAddBook(onAddAction, onCloseAction);

  const totalPages = Math.ceil(Math.min(store.totalItems, 100) / 20);

  return (
    <Modal isOpen={isOpen} onClose={onCloseAction}>
      <Card
        material="glass"
        variant="outline"
        scaleFactor="body"
        className={css({ boxShadow: "2xl" })}
      >
        <CloseButton
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
            <ManualInputForm />
          ) : (
            <Stack dir="column">
              <Flex align="flex-end" gap={2}>
                <s.div flex={1}>
                  <TextInput
                    name={
                      store.mode === "isbn" ? "ISBNで検索" : "キーワードで検索"
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
                    <Loader2 size={16} className={css({ animation: "spin" })} />
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
              onChange={setField("genre")}
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
            _disabled={{
              opacity: 0.3,
              cursor: "not-allowed",
            }}
          >
            星を誕生させる
          </s.button>
        </s.div>
      </Card>
    </Modal>
  );
}
