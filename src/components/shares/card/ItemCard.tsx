import Card from "~liftkit/card";

interface ItemCardProps {
  children: React.ReactNode;
}

export default function ItemCard(props: ItemCardProps) {
  const { children, ...restProps } = props;

  return (
    <Card
      material="glass"
      variant="transparent"
      scaleFactor="body"
      materialProps={{ thickness: "thin" }}
      {...restProps}
    >
      {children}
    </Card>
  );
}
