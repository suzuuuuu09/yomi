import { X } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import styles from "./close-button.module.css";

export default function CloseButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="閉じる"
      {...props}
      className={`${styles.button} ${className ?? ""}`}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}
