"use client";

import { Camera, LoaderCircle, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Box, Flex, styled as s } from "styled-system/jsx";
import { token } from "styled-system/tokens";
import { SearchResultItem } from "@/components/SearchResultItem";
import styles from "@/components/sections/add-book-modal.module.css";
import CloseButton from "@/components/shares/CloseButton";
import BookInfoFields from "@/components/shares/field/BookInfoFields";
import Modal from "@/components/shares/modal/Modal";
import { GENRES } from "@/consts/genre";
import { useAddBook } from "@/hooks/useAddBook";
import type { BookSearchMode } from "@/types/book-search";
import type { Book } from "@/types/library";
import IconButton from "~liftkit/icon-button";
import Text from "~liftkit/text";

const BarcodeScanner = dynamic(
  () => import("@/components/BarCodeScanner").then((m) => m.BarcodeScanner),
  { ssr: false },
);

const COVER_FALLBACK = "/images/book-cover-fallback.png";

const MODES: { mode: BookSearchMode; label: string }[] = [
  { mode: "search", label: "キーワード" },
  { mode: "isbn", label: "ISBN" },
  { mode: "manual", label: "手動入力" },
];

interface AddBlockModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onAddAction: (book: Partial<Book>) => Promise<boolean>;
}

type CoverState = "book" | "fallback";

export default function AddBookModal(props: AddBlockModalProps) {
  const { isOpen, onCloseAction, onAddAction } = props;
  const {
    store,
    form,
    setField,
    handleSelectResult,
    handleSubmit,
    canSubmit,
    isSubmitting,
  } = useAddBook(onAddAction, onCloseAction);

  const handleClose = () => {
    if (isSubmitting) return;
    store.reset();
    onCloseAction();
  };

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const frame = requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      );
      firstField?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

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

  const selected = store.selectedResult;
  const [coverState, setCoverState] = useState<CoverState>("book");

  useEffect(() => {
    setCoverState(selected?.thumbnail ? "book" : "fallback");
  }, [selected]);

  const coverSrc =
    coverState === "book" && selected?.thumbnail
      ? selected.thumbnail.replace("http://", "https://")
      : COVER_FALLBACK;
  const showBookCover = coverState === "book" && Boolean(selected?.thumbnail);

  const totalPages =
    store.mode === "isbn" ? 1 : Math.ceil(store.totalItems / 20);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="floating"
      maxW="3xl"
      className={styles.position}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-labelledby="add-book-title"
      >
        <CloseButton onClick={handleClose} />

        <header className={styles.header}>
          <h2 id="add-book-title" className={styles.title}>
            本を追加
          </h2>
        </header>

        <fieldset
          disabled={isSubmitting}
          inert={isSubmitting}
          aria-busy={isSubmitting}
          className={styles.fieldset}
        >
          <div className={styles.layout}>
            <div className={styles.searchColumn}>
              <div className={styles.modeRow}>
                {MODES.map(({ mode, label }) => (
                  <button
                    key={mode}
                    type="button"
                    className={`${styles.modeButton} ${
                      store.mode === mode ? styles.modeButtonActive : ""
                    }`}
                    onClick={() => store.setMode(mode)}
                    aria-pressed={store.mode === mode}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {store.mode === "manual" ? (
                <p className={styles.resultsHint}>
                  各項目を入力して登録できます。
                </p>
              ) : (
                <>
                  <div className={styles.searchField}>
                    <button
                      type="button"
                      className={styles.searchIconButton}
                      onClick={() => {
                        if (store.query.trim() && !store.isSearching) {
                          store.fetchPage(0);
                        }
                      }}
                      aria-label="検索"
                    >
                      <Search size={18} aria-hidden="true" />
                    </button>
                    <input
                      className={styles.searchInput}
                      name={store.mode === "isbn" ? "ISBN" : "キーワード"}
                      placeholder={
                        store.mode === "isbn"
                          ? "97..."
                          : "タイトルや著者名で検索"
                      }
                      aria-label={
                        store.mode === "isbn" ? "ISBNを検索" : "本を検索"
                      }
                      inputMode={store.mode === "isbn" ? "numeric" : undefined}
                      value={store.query}
                      onChange={(e) => store.setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          store.fetchPage(0);
                        }
                      }}
                    />
                    {store.isSearching ? (
                      <LoaderCircle
                        size={18}
                        className={styles.spinner}
                        aria-hidden="true"
                      />
                    ) : store.query ? (
                      <button
                        type="button"
                        className={styles.clearButton}
                        onClick={() => store.setQuery("")}
                        aria-label="検索語を消去"
                      >
                        <X size={16} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>

                  {store.error && (
                    <s.p role="alert" className={styles.error}>
                      {store.error}
                    </s.p>
                  )}

                  {store.mode === "isbn" && (
                    <button
                      type="button"
                      onClick={startCamera}
                      className={styles.scanButton}
                      title="カメラでバーコードをスキャン"
                    >
                      <Camera size={16} aria-hidden="true" />
                      カメラでスキャン
                    </button>
                  )}

                  <div className={styles.results}>
                    {!store.isSearching &&
                      store.searchResults.map((book) => (
                        <SearchResultItem
                          key={book.id}
                          book={book}
                          isSelected={store.selectedResult?.id === book.id}
                          onSelect={handleSelectResult}
                        />
                      ))}
                    {store.isSearching && (
                      <p className={styles.resultsHint}>検索中…</p>
                    )}
                    {!store.isSearching &&
                      store.hasSearched &&
                      store.searchResults.length === 0 && (
                        <p className={styles.empty}>
                          検索結果が見つかりませんでした
                        </p>
                      )}
                    {!store.isSearching && !store.hasSearched && (
                      <p className={styles.resultsHint}>
                        検索キーワードを入力して結果を表示
                      </p>
                    )}
                  </div>

                  {totalPages > 1 && store.mode !== "isbn" && (
                    <Flex align="center" justify="center" gap={4}>
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
                </>
              )}
            </div>

            <div className={styles.detailColumn}>
              {store.mode === "manual" ? (
                <BookInfoFields
                  values={{
                    title: form.title,
                    author: form.author,
                    pages: form.pages,
                    isbn: form.isbn,
                    genre: form.genre,
                  }}
                  onChange={setField}
                />
              ) : selected ? (
                <div className={styles.detailBody}>
                  <div className={styles.detailCover}>
                    <Image
                      src={coverSrc}
                      alt={
                        showBookCover ? `${selected.title}の書影` : "書影なし"
                      }
                      width={118}
                      height={166}
                      sizes="118px"
                      className={styles.detailCoverImage}
                      onError={() =>
                        setCoverState((previous) =>
                          previous === "book" ? "fallback" : previous,
                        )
                      }
                    />
                  </div>
                  <h3 className={styles.detailTitle}>{selected.title}</h3>
                  <p className={styles.detailAuthor}>
                    {selected.authors?.join(", ") || "—"}
                  </p>
                  <dl className={styles.metadata}>
                    {selected.page ? (
                      <div>
                        <dt>ページ数</dt>
                        <dd>{selected.page}ページ</dd>
                      </div>
                    ) : null}
                    {selected.isbn ? (
                      <div>
                        <dt>ISBN</dt>
                        <dd>{selected.isbn}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt>ジャンル</dt>
                      <dd>
                        <select
                          className={styles.genreSelect}
                          value={form.genre}
                          onChange={(e) => setField("genre", e.target.value)}
                          aria-label="ジャンル"
                        >
                          <option value="">未選択</option>
                          {GENRES.map(({ id, label }) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className={styles.placeholder}>
                  <p>
                    検索結果から本を選択すると、ここに書影と情報が表示されます。
                  </p>
                </div>
              )}

              <button
                type="button"
                className={styles.addButton}
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "追加中..." : "この本を追加"}
              </button>
            </div>
          </div>
        </fieldset>

        {scanStep !== "idle" &&
          createPortal(
            <Box
              position="fixed"
              inset="0"
              zIndex={1100}
              pointerEvents="auto"
              p="4"
              overflowY="auto"
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
                <CloseButton
                  onClick={closeScanner}
                  aria-label="スキャナーを閉じる"
                />

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
            </Box>,
            document.body,
          )}
      </div>
    </Modal>
  );
}
