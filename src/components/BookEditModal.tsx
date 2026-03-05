"use client";

import { Check } from "lucide-react";
import { css } from "styled-system/css";
import { Flex, styled as s } from "styled-system/jsx";
import Modal from "@/components/shares/modal/Modal";
import BookInfoFields from "@/components/shares/field/BookInfoFields";
import type { Book } from "@/types/library";
import { useEditBook } from "@/hooks/useEditBook";
import FeatureCard from "@/components/shares/card/FeatureCard";

interface BookEditModalProps {
  isOpen: boolean;
  book: Book | null;
  onCloseAction: () => void;
  onSaveAction: (bookId: string, updates: Partial<Book>) => void;
}

export default function BookEditModal(props: BookEditModalProps) {
  const { isOpen, book, onCloseAction, onSaveAction } = props;
  const { editForm, handleChange, buildUpdates } = useEditBook(book);

  if (!book) return null;

  const handleSave = () => {
    onSaveAction(book.id, buildUpdates());
    onCloseAction();
  };

  return (
    <Modal isOpen={isOpen} onClose={onCloseAction}>
      <FeatureCard
        title="星の情報を編集"
        description="本の詳細を更新する"
        icon="pencil"
        onCloseAction={onCloseAction}
      >
        <BookInfoFields values={editForm} onChange={handleChange} />

        <Flex gap={2} mt={6}>
          <s.button
            type="button"
            onClick={onCloseAction}
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="medium"
            cursor="pointer"
            className={css({
              bg: "white/5",
              color: "slate.400",
              transition: "all 0.2s",
              _hover: { bg: "white/10", color: "white" },
            })}
          >
            キャンセル
          </s.button>
          <s.button
            type="button"
            onClick={handleSave}
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="medium"
            cursor="pointer"
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap={1}
            className={css({
              bg: "indigo.500/20",
              border: "1px solid",
              borderColor: "indigo.500/30",
              color: "indigo.300",
              transition: "all 0.2s",
              _hover: { bg: "indigo.500/30", color: "indigo.200" },
            })}
          >
            <Check size={13} />
            保存
          </s.button>
        </Flex>
      </FeatureCard>
    </Modal>
  );
}
