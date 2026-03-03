import type { IconName } from "lucide-react/dynamic";
import { DynamicIcon } from "lucide-react/dynamic";
import Card, { type LkCardProps } from "~liftkit/card";

interface IconCardButtonProps
  extends Omit<LkCardProps, "children" | "isClickable"> {
  icon: IconName;
  iconSize?: number;
  label: string;
  children?: React.ReactNode;
}

export function IconCardButton({
  icon,
  iconSize = 15,
  label,
  material = "glass",
  variant = "outline",
  scaleFactor = "caption",
  materialProps = { thickness: "thin" },
  className,
  ...restProps
}: IconCardButtonProps) {
  return (
    <Card
      material={material}
      variant={variant}
      scaleFactor={scaleFactor}
      materialProps={materialProps}
      isClickable
      aria-label={label}
      className={`shadow-lg shadow-black/20 text-slate-400 hover:text-white ${className ?? ""}`}
      {...restProps}
    >
      <DynamicIcon name={icon} size={iconSize} />
    </Card>
  );
}
