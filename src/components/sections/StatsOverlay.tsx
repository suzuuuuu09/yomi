import { sva } from "styled-system/css";
import type { Book } from "@/types/library";
import Card from "~liftkit/card";
import Row from "~liftkit/row";

const statsOverlayStyles = sva({
  slots: ["root", "content", "divider"],
  base: {
    root: {
      visibility: "hidden",
      md: {
        visibility: "visible",
      },
      position: "fixed",
      bottom: 6,
      left: 16,
      zIndex: 20,
    },
    content: {
      display: "flex",
      alignItems: "center",
      fontSize: "10px",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      color: "slate.400",
    },
    divider: {
      width: "1px",
      height: "3",
      bg: "slate.600",
    },
  },
});

export default function StatsOverlay({ books }: { books: Book[] }) {
  // statsOverlayを表示しているかのストア
  const styles = statsOverlayStyles();

  return (
    <section className={styles.root}>
      <Card
        material="glass"
        variant="outline"
        scaleFactor="caption"
        materialProps={{ thickness: "thin" }}
      >
        <Row gap="lg" className={styles.content}>
          <span>{books.length} stars</span>
          <span className={styles.divider} />
          <span>
            {books.filter((b) => b.status === "completed").length}{" "}
            constellations
          </span>
        </Row>
      </Card>
    </section>
  );
}
