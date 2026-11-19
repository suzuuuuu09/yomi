"use client";

import { BookOpen } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "@/components/book-edit-modal.module.css";
import CloseButton from "@/components/shares/CloseButton";
import BookInfoFields from "@/components/shares/field/BookInfoFields";
import Modal from "@/components/shares/modal/Modal";
import { useEditBook } from "@/hooks/useEditBook";
import type { Book } from "@/types/library";

const COVER_FALLBACK = "/images/book-cover-fallback.png";

type CoverState = "book" | "fallback" | "none";

interface BookEditModalProps {
  isOpen: boolean;
  book: Book | null;
  onCloseAction: () => void;
  onSaveAction: (
    bookId: string,
    updates: Partial<Book>,
  ) => Promise<boolean> | undefined;
}

export default function BookEditModal(props: BookEditModalProps) {
  const { isOpen, book, onCloseAction, onSaveAction } = props;
  const { editForm, handleChange, buildUpdates } = useEditBook(book);
  const bookId = book?.id;
  const dialogRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [coverState, setCoverState] = useState<CoverState>(
    book?.coverUrl ? "book" : "fallback",
  );

  useEffect(() => {
    setCoverState(book?.coverUrl ? "book" : "fallback");
  }, [book?.coverUrl]);

  useEffect(() => {
    if (!isOpen || !bookId) return;
    const frame = requestAnimationFrame(() => {
      const firstField = dialogRef.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      );
      firstField?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen, bookId]);

  if (!book) return null;

  const bookCoverUrl = book.coverUrl.replace("http://", "https://");
  const showBookCover = coverState === "book" && Boolean(bookCoverUrl);
  const coverSrc = showBookCover ? bookCoverUrl : COVER_FALLBACK;

  const handleClose = () => {
    if (!savingRef.current) onCloseAction();
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;

    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = await onSaveAction(book.id, buildUpdates());
      if (saved === false) {
        setSaveError("保存できませんでした。もう一度お試しください。");
      } else {
        onCloseAction();
      }
    } catch {
      setSaveError("保存できませんでした。もう一度お試しください。");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="floating"
      placement="end"
      maxW="lg"
      className={styles.position}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        data-star-tool="edit"
        aria-labelledby="book-edit-title"
      >
        <CloseButton onClick={handleClose} disabled={isSaving} />

        <header className={styles.header}>
          <h2 id="book-edit-title" className={styles.title}>
            本の情報を編集
          </h2>
        </header>

        <form
          className={styles.form}
          onSubmit={(event) => void handleSave(event)}
        >
          <fieldset
            className={styles.fieldset}
            disabled={isSaving}
            inert={isSaving}
            aria-busy={isSaving}
          >
            <BookInfoFields
              layout="edit"
              values={editForm}
              onChange={handleChange}
              cover={
                <div className={styles.coverFrame}>
                  {coverState === "none" ? (
                    <div
                      className={styles.coverFallback}
                      role="img"
                      aria-label="書影なし"
                    >
                      <BookOpen size={34} />
                    </div>
                  ) : (
                    <Image
                      src={coverSrc}
                      alt={showBookCover ? `${book.title}の書影` : "書影なし"}
                      width={140}
                      height={214}
                      sizes="140px"
                      className={styles.coverImage}
                      onError={() =>
                        setCoverState((previous) =>
                          previous === "book" ? "fallback" : "none",
                        )
                      }
                    />
                  )}
                </div>
              }
            />

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.cancel}`}
                onClick={handleClose}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className={`${styles.button} ${styles.save}`}
              >
                {isSaving ? "保存中..." : "変更を保存"}
              </button>
            </div>
          </fieldset>
          {saveError && (
            <p role="alert" className={styles.error}>
              {saveError}
            </p>
          )}
        </form>
      </div>
    </Modal>
  );
}
