import type { IconName } from "lucide-react/dynamic";
import { styled as s } from "styled-system/jsx";
import type { BookSearchMode } from "@/types/book-search";
import Button from "~liftkit/button";

interface ModeButtonProps {
  mode: BookSearchMode;
  current: BookSearchMode;
  onClick: (mode: BookSearchMode) => void;
  icon: IconName;
  label: string;
}

export const ModeButton = (props: ModeButtonProps) => {
  const { mode, current, onClick, icon, label } = props;
  const isSelected = current === mode;

  return (
    <s.div
      flex={1}
      display="flex"
      style={
        isSelected
          ? { filter: "drop-shadow(0 0 10px rgba(99,102,241,0.55))" }
          : undefined
      }
    >
      <Button
        label={label}
        startIcon={icon}
        variant={isSelected ? "fill" : "text"}
        color={isSelected ? "primarycontainer" : "surfacevariant"}
        size="sm"
        onClick={() => onClick(mode)}
        style={{
          width: "100%",
          justifyContent: "center",
          opacity: isSelected ? 1 : 0.5,
          transition: "all 0.2s ease",
        }}
      />
    </s.div>
  );
};
