import { useState } from "react";

export function useDelBook(
  onDeleteAction: (bookId: string) => void,
  onCloseAction: () => void,
) {
  const [confirming, setConfirming] = useState(false);

  const handleDelete = (bookId: string) => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    onDeleteAction(bookId);
    onCloseAction();
  };

  const handleCancel = () => {
    setConfirming(false);
    onCloseAction();
  };

  return { handleDelete, handleCancel };
}
