"use client";

import { useState } from "react";
import { Box, Flex, styled as s } from "styled-system/jsx";
import CloseButton from "@/components/shares/CloseButton";
import Modal from "@/components/shares/modal/Modal";

interface DeleteBookModalProps {
  isOpen: boolean;
  bookId: string;
  onCloseAction: () => void;
  onArchiveAction: (bookId: string) => void;
  onPermanentDeleteAction: (bookId: string) => void;
}

export default function DeleteBookModal(props: DeleteBookModalProps) {
  const {
    isOpen,
    bookId,
    onCloseAction,
    onArchiveAction,
    onPermanentDeleteAction,
  } = props;
  const [confirming, setConfirming] = useState<"archive" | "permanent" | null>(
    null,
  );

  const handleCancel = () => {
    setConfirming(null);
    onCloseAction();
  };

  const handleArchive = () => {
    if (confirming !== "archive") {
      setConfirming("archive");
      return;
    }
    onArchiveAction(bookId);
    setConfirming(null);
  };

  const handlePermanentDelete = () => {
    if (confirming !== "permanent") {
      setConfirming("permanent");
      return;
    }
    onPermanentDeleteAction(bookId);
    setConfirming(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <Box
        position="relative"
        role="dialog"
        aria-labelledby="delete-book-title"
        p={4}
        pt={14}
        rounded="2xl"
        border="1px solid"
        borderColor="red.500/20"
        bg="red.500/6"
        animation="fadeIn 0.15s ease-out"
      >
        <CloseButton onClick={handleCancel} aria-label="削除確認を閉じる" />
        <s.p
          id="delete-book-title"
          fontSize="xs"
          color="red.300"
          mb={3}
          textAlign="center"
        >
          {confirming === "permanent"
            ? "本と読書履歴を完全削除しますか？"
            : confirming === "archive"
              ? "本をアーカイブしますか？"
              : "この本をどうしますか？"}
          <br />
          <s.span color="slate.500">
            {confirming === "permanent"
              ? "この操作は取り消せません"
              : "アーカイブなら読書履歴を残して後から復元できます"}
          </s.span>
        </s.p>
        <Flex gap={2}>
          <s.button
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="medium"
            cursor="pointer"
            bg="white/5"
            border="1px solid"
            borderColor="white/10"
            color="slate.400"
            transition="all 0.15s"
            _hover={{ bg: "white/10", color: "white" }}
            onClick={() => handleCancel()}
          >
            キャンセル
          </s.button>
          <s.button
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="semibold"
            cursor="pointer"
            bg="red.500/15"
            border="1px solid"
            borderColor="red.500/30"
            color="red.400"
            transition="all 0.15s"
            _hover={{ bg: "red.500/25", color: "red.300" }}
            onClick={handleArchive}
          >
            {confirming === "archive"
              ? "もう一度押してアーカイブ"
              : "アーカイブ"}
          </s.button>
        </Flex>
        <s.button
          type="button"
          mt={2}
          w="full"
          py={2}
          rounded="xl"
          fontSize="10px"
          color="red.400"
          cursor="pointer"
          onClick={handlePermanentDelete}
        >
          {confirming === "permanent"
            ? "もう一度押して完全削除"
            : "完全削除（復元できません）"}
        </s.button>
      </Box>
    </Modal>
  );
}
