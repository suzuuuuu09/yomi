"use client";

import { css, sva } from "styled-system/css";
import type { BookStatus } from "@/types/library";
import Card from "~liftkit/card";
import Row from "~liftkit/row";
import Text from "~liftkit/text";

const FILTERS: { label: string; value: BookStatus | "all" }[] = [
  { label: "すべて", value: "all" },
  { label: "読書中", value: "reading" },
  { label: "未読", value: "unread" },
  { label: "読了", value: "completed" },
];

const filterTabStyle = sva({
  slots: ["button", "count"],
  base: {
    button: {
      display: "flex",
      alignItems: "center",
      gap: "1",
      px: "3",
      py: "1.5",
      rounded: "xl",
      fontSize: "xs",
      fontWeight: "medium",
      transitionProperty: "all",
      transitionDuration: "200ms",
      cursor: "pointer",
      flexShrink: 0,
    },
  },
  variants: {
    active: {
      true: {
        button: { bg: "white/12", color: "white", shadow: "sm" },
        count: { color: "slate.300" },
      },
      false: {
        button: {
          color: "slate.400",
          _hover: { color: "slate.200", bg: "white/4" },
        },
        count: { color: "slate.500" },
      },
    },
  },
});

export type FilterTabsCounts = {
  all: number;
  reading: number;
  unread: number;
  completed: number;
};

export default function FilterTabs({
  activeFilter,
  setFilter,
  counts,
  cardMaterial = "glass",
}: {
  activeFilter: BookStatus | "all";
  setFilter: (value: BookStatus | "all") => void;
  counts: FilterTabsCounts;
  cardMaterial?: "glass" | "flat";
}) {
  return (
    <Card
      material={cardMaterial}
      variant="outline"
      scaleFactor="caption"
      materialProps={{ thickness: "thin" }}
      className={
        cardMaterial === "glass"
          ? css({ shadow: "lg", shadowColor: "black/20" })
          : undefined
      }
    >
      <Row
        gap="xs"
        className={css({
          display: "flex",
          alignItems: "center",
          overflowX: "auto",
          "&::-webkit-scrollbar": { display: "none" },
        })}
      >
        {FILTERS.map((f) => {
          const count = counts[f.value];
          const styles = filterTabStyle({ active: activeFilter === f.value });
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={styles.button}
            >
              {f.label}
              <Text
                tag="span"
                fontClass="capline"
                className={`${styles.count} tabular-nums`}
              >
                {count}
              </Text>
            </button>
          );
        })}
      </Row>
    </Card>
  );
}
