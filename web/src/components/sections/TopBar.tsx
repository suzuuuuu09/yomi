"use client";

import Card from "~liftkit/card";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";
import type { BookStatus } from "@/types/library";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";
import { css, sva } from "styled-system/css";
import { Flex, styled as s } from "styled-system/jsx";
import Row from "~liftkit/row";
import { IconCardButton } from "@/components/shares/IconCardButton";
import Column from "~liftkit/column";

const filters: { label: string; value: BookStatus | "all" }[] = [
  { label: "すべて", value: "all" },
  { label: "読書中", value: "reading" },
  { label: "未読", value: "unread" },
  { label: "読了", value: "completed" },
];

const BookFilter = (props: {
  activeFilter: BookStatus | "all";
  setFilter: (value: BookStatus | "all") => void;
  bookCount: {
    total: number;
    reading: number;
    unread: number;
    completed: number;
  };
}) => {
  const { activeFilter, setFilter, bookCount } = props;
  const filterStyle = sva({
    slots: ["button", "count"],
    base: {
      button: {
        display: "flex",
        alignItems: "center",
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
          button: {
            bg: "white/12",
            color: "white",
            shadow: "sm",
          },
          count: {
            color: "slate-300",
          },
        },
        false: {
          button: {
            color: "slate-400",
            _hover: {
              color: "slate-200",
              bg: "white/4",
            },
          },
          count: {
            color: "slate-500",
          },
        },
      },
    },
  });

  return (
    <Card
      material="glass"
      variant="outline"
      scaleFactor="caption"
      materialProps={{ thickness: "thin" }}
      className={css({
        shadow: "lg",
        shadowColor: "black/20",
      })}
    >
      <Row
        gap="xs"
        className={css({
          display: "flex",
          alignItems: "center",
          overflowX: "auto",
          scrollbarGutter: "stable",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        })}
      >
        {filters.map((f) => {
          const count =
            f.value === "all"
              ? bookCount.total
              : bookCount[f.value as BookStatus];
          const styles = filterStyle({ active: activeFilter === f.value });
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
};

export default function TopBar({
  bookCount,
  onOpenBookList,
}: {
  bookCount: {
    total: number;
    reading: number;
    unread: number;
    completed: number;
  };
  onOpenBookList: () => void;
}) {
  const { activeFilter, query, setFilter, setQuery, clearSearch } =
    useLibraryFilterStore();

  return (
    <s.header
      position="fixed"
      top={{ base: "3", md: "4" }}
      left={{ base: "3", md: "4" }}
      right={{ base: "3", md: "4" }}
      zIndex="30"
      spaceY="2"
    >
      <Column gap="xs">
        <Row gap="xs">
          {/* Logo */}
          <Card
            material="glass"
            variant="outline"
            scaleFactor="caption"
            materialProps={{ thickness: "thin" }}
            className="shrink-0 shadow-lg shadow-black/20"
          >
            <Text
              tag="span"
              fontClass="callout-bold"
              className="tracking-widest"
              style={{
                background: "linear-gradient(135deg,#818cf8,#a855f7,#ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              YOMi
            </Text>
          </Card>

          <TextInput
            name=""
            placeholder="星を検索..."
            endIcon={query ? "x" : "search"}
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            onEndIconClick={query ? clearSearch : undefined}
          />
          <Flex shrink={0} gap="1.5" align="center">
            <IconCardButton
              icon="library"
              label="本の一覧"
              onClick={onOpenBookList}
              className={css({
                shadow: "lg",
                color: "slate.400",
                shadowColor: "black/20",
                "@media (hover: hover)": {
                  _hover: {
                    color: "white",
                  },
                },
              })}
            />
            {/* <UserMenu /> */}
          </Flex>
        </Row>

        <BookFilter
          activeFilter={activeFilter}
          setFilter={setFilter}
          bookCount={bookCount}
        />
      </Column>
    </s.header>
  );
}
