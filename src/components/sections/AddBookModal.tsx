"use client";

import { Camera, Search, X } from "lucide-react";
import type { IconName } from "lucide-react/dynamic";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Box, Flex, Stack, styled as s } from "styled-system/jsx";
import { token } from "styled-system/tokens";
import { ModeButton } from "@/components/ModeButton";
import { SearchResultItem } from "@/components/SearchResultItem";
import FeatureCard from "@/components/shares/card/FeatureCard";
import BookInfoFields from "@/components/shares/field/BookInfoFields";
import Modal from "@/components/shares/modal/Modal";
import { useAddBook } from "@/hooks/useAddBook";
import type { BookInfoValues, BookSearchMode } from "@/types/book-search";
import type { Book } from "@/types/library";
import IconButton from "~liftkit/icon-button";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";

const BarcodeScanner = dynamic(
  () => import("@/components/BarCodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false },
);

const MODES: { mode: BookSearchMode; label: string; icon: IconName }[] = [
  { mode: "search", label: "キーワード", icon: "search" },
  { mode: "isbn", label: "ISBN", icon: "book-open" },
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

  type ScanStep = "idle" | "scanning" | "post-confirm";
  const [scanStep, setScanStep] = useState<ScanStep>("idle");
  const [scannedIsbn, setScannedIsbn] = useState<string | null>(null);

  const startCamera = () => setScanStep("scanning");
  const closeScanner = () => {
    setScanStep("idle");
    setScannedIsbn(null);
  };

  const handleBarcodeScan = (isbn: string) => {
    setScannedIsbn(isbn);
    setScanStep("post-confirm");
  };

  const confirmScan = () => {
    if (!scannedIsbn) return;
    store.setQuery(scannedIsbn);
    closeScanner();
    store.fetchPage(0);
  };

  const handleFormChange = (field: keyof typeof form, value: string) => {
    setField(field)({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  // TODO: APIの総件数からページ数を計算できるようにする
  const totalPages = Math.ceil(Math.min(store.totalItems, 100));

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
            <Stack dir="column" gap={2}>
              <TextInput
                name={store.mode === "isbn" ? "ISBN" : "キーワード"}
                placeholder={
                  store.mode === "isbn" ? "97..." : "タイトルや著者名で検索"
                }
                endIcon={store.isSearching ? "loader-circle" : "search"}
                value={store.query}
                onChange={(e) => store.setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && store.fetchPage(0)}
                onEndIconClick={
                  store.query.trim() && !store.isSearching
                    ? () => store.fetchPage(0)
                    : undefined
                }
              />
              {store.mode === "isbn" && (
                <s.button
                  type="button"
                  onClick={startCamera}
                  w="full"
                  py={2}
                  rounded="xl"
                  bg="indigo.500/15"
                  border="1px solid"
                  borderColor="indigo.500/40"
                  color="indigo.300"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={2}
                  cursor="pointer"
                  _hover={{ bg: "indigo.500/25" }}
                  title="カメラでバーコードをスキャン"
                >
                  <Camera size={16} />
                  <s.span fontSize="sm">カメラでスキャン</s.span>
                </s.button>
              )}
            </Stack>

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
                <IconButton
                  icon="chevron-left"
                  onClick={() => store.fetchPage(store.currentPage - 1)}
                  disabled={store.currentPage === 0}
                  variant="text"
                  aria-label="前のページ"
                />
                <Text
                  tag="span"
                  fontClass="caption"
                  style={{ color: token("colors.slate.500") }}
                >
                  {store.currentPage + 1} / {totalPages}
                </Text>
                <IconButton
                  icon="chevron-right"
                  onClick={() => store.fetchPage(store.currentPage + 1)}
                  disabled={store.currentPage >= totalPages - 1}
                  variant="text"
                  aria-label="次のページ"
                />
              </Flex>
            )}

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

        {scanStep !== "idle" && (
          <Box
            position="fixed"
            inset="0"
            zIndex="50"
            bg="black/80"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box
              position="relative"
              w="full"
              maxW="md"
              mx="4"
              bg="gray.950"
              rounded="2xl"
              overflow="hidden"
            >
              <s.button
                type="button"
                onClick={closeScanner}
                position="absolute"
                top="3"
                right="3"
                zIndex="10"
                p="1"
                rounded="full"
                bg="gray.800/80"
                color="gray.300"
                _hover={{ bg: "gray.700" }}
              >
                <X size={18} />
              </s.button>

              {scanStep === "scanning" && (
                <BarcodeScanner onScan={handleBarcodeScan} />
              )}

              {scanStep === "post-confirm" && (
                <Box p="8" textAlign="center">
                  <Box
                    mb="4"
                    display="inline-flex"
                    p="4"
                    rounded="full"
                    bg="green.500/15"
                    color="green.300"
                  >
                    <Search size={32} />
                  </Box>
                  <s.p fontSize="lg" fontWeight="bold" color="white" mb="2">
                    バーコードを読み取りました
                  </s.p>
                  <s.p fontSize="sm" color="gray.400" mb="2">
                    以下のISBNで検索しますか？
                  </s.p>
                  <s.p
                    fontSize="xl"
                    fontWeight="mono"
                    color="indigo.200"
                    mb="6"
                    letterSpacing="widest"
                  >
                    {scannedIsbn}
                  </s.p>
                  <Flex gap="3" justify="center">
                    <s.button
                      type="button"
                      onClick={() => setScanStep("scanning")}
                      px="5"
                      py="2"
                      rounded="xl"
                      bg="gray.800"
                      color="gray.300"
                      border="1px solid"
                      borderColor="gray.700"
                      _hover={{ bg: "gray.700" }}
                    >
                      やり直す
                    </s.button>
                    <s.button
                      type="button"
                      onClick={confirmScan}
                      px="5"
                      py="2"
                      rounded="xl"
                      bg="indigo.500/30"
                      color="indigo.200"
                      border="1px solid"
                      borderColor="indigo.500/50"
                      _hover={{ bg: "indigo.500/40" }}
                    >
                      この本を検索する
                    </s.button>
                  </Flex>
                </Box>
              )}
            </Box>
          </Box>
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
