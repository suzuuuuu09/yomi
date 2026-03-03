import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import { cva } from "styled-system/css";
import type { BookStatus } from "@/types/library";

const STATUS_LABEL: Record<BookStatus, string> = {
  reading: "読書中",
  unread: "未読",
  completed: "読了",
};

const STATUS_ICON: Record<BookStatus, React.ReactNode> = {
  reading: <BookOpen size={10} />,
  unread: <Circle size={10} />,
  completed: <CheckCircle2 size={10} />,
};

const statusBadgeStyle = cva({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "1.5",
    px: "2.5",
    py: "1",
    rounded: "md",
    fontSize: "10px",
    fontWeight: "medium",
    border: "1px solid",
    flexShrink: 0,
  },
  variants: {
    status: {
      reading: {
        color: "emerald.400",
        bg: "emerald.500/10",
        borderColor: "emerald.500/20",
      },
      unread: {
        color: "amber.400",
        bg: "amber.500/10",
        borderColor: "amber.500/20",
      },
      completed: {
        color: "blue.400",
        bg: "blue.500/10",
        borderColor: "blue.500/20",
      },
    },
  },
});

export default function StatusBadge(props: { status?: BookStatus }) {
  const { status } = props;
  const style = statusBadgeStyle({ status: status || "unread" });

  if (!status) return null;

  return (
    <span className={style}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status]}
    </span>
  );
}
