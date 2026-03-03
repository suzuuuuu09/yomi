import type { LkIconButtonProps } from "~liftkit/icon-button";
import IconButton from "~liftkit/icon-button";

interface CloseButtonProps extends Omit<LkIconButtonProps, "icon"> {}

export default function CloseButton(props: CloseButtonProps) {
  return <IconButton icon="x" variant="text" aria-label="Close" {...props} />;
}
