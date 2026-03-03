import React from "react";
import Modal from "@/components/shares/modal/Modal";
import { Flex, styled as s } from "styled-system/jsx";
import { useDelBook } from "@/hooks/useDelBook";

interface DeleteBookModalProps {
  isOpen: boolean;
  bookId: string;
  onCloseAction: () => void;
  onDeleteAction: (bookId: string) => void;
}

export default function DeleteBookModal(props: DeleteBookModalProps) {
  const { isOpen, bookId, onCloseAction, onDeleteAction } = props;
  const { handleDelete, handleCancel } = useDelBook(
    onDeleteAction,
    onCloseAction,
  );

  return (
    <Modal isOpen={isOpen} onClose={handleCancel}>
      <s.div
        p={4}
        rounded="2xl"
        border="1px solid"
        borderColor="red.500/20"
        bg="red.500/6"
        animation="fadeIn 0.15s ease-out"
      >
        <s.p fontSize="xs" color="red.300" mb={3} textAlign="center">
          この本を削除しますか？
          <br />
          <s.span color="slate.500">この操作は取り消せません</s.span>
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
            onClick={() => handleDelete(bookId)}
          >
            削除する
          </s.button>
        </Flex>
      </s.div>
    </Modal>
  );
}
