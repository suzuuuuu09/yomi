"use client";

import { useMemo, useState } from "react";
import { css } from "styled-system/css";
import { Box, Flex, Stack, styled as s } from "styled-system/jsx";
import { useBookList } from "@/hooks/useBookList";
import useBookListStore from "@/store/useBookListStore";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book, BookStatus } from "@/types/library";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";
import CloseButton from "@/components/shares/CloseButton";
import FilterTabs from "@/components/shares/FilterTabs";
import StatusBadge from "@/components/shares/badge/StatusBadge";

function BookRow({ book, onClick }: { book: Book; onClick: () => void }) {
  const pct =
    book.totalPages > 0
      ? Math.round((book.currentPage / book.totalPages) * 100)
      : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={css({
        w: "full",
        display: "flex",
        alignItems: "center",
        gap: "3",
        px: "4",
        py: "3",
        textAlign: "left",
        cursor: "pointer",
        transitionProperty: "colors",
        transitionDuration: "150ms",
        _hover: { bg: "white/4" },
        _active: { bg: "white/7" },
      })}
    >
      <Box
        position="relative"
        w="10"
        h="10"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        <Box
          position="absolute"
          inset="1"
          rounded="full"
          opacity={0.2}
          style={{ background: book.color }}
        />
        <Box
          w="5"
          h="5"
          rounded="full"
          position="relative"
          style={{
            background: `radial-gradient(circle at 35% 35%, white, ${book.color})`,
          }}
        />
      </Box>

      <Stack flex={1} gap="0" minW={0}>
        <Text
          tag="p"
          fontClass="callout"
          className={css({
            color: "slate.100",
            truncate: true,
            fontWeight: "medium",
          })}
        >
          {book.title}
        </Text>
        <Text
          tag="p"
          fontClass="caption"
          className={css({ color: "slate.500", truncate: true, mt: "0.5" })}
        >
          {book.author}
        </Text>

        {book.status !== "unread" && (
          <Flex mt="1.5" alignItems="center" gap="2">
            <Box flex={1} h="1" rounded="full" bg="white/6" overflow="hidden">
              <Box
                h="full"
                rounded="full"
                transitionProperty="all"
                transitionDuration="700ms"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, #6366f1, #a855f7)",
                }}
              />
            </Box>
            <Text
              tag="span"
              fontClass="capline"
              className={css({
                fontVariantNumeric: "tabular-nums",
                color: "slate.500",
                flexShrink: 0,
              })}
            >
              {pct}%
            </Text>
          </Flex>
        )}
      </Stack>

      <StatusBadge status={book.status} />
    </button>
  );
}

export default function BookListDrawer() {
  const books = useLibraryStore((s) => s.books);
  const { isOpen, close } = useBookListStore();
  const { handleSelectBook } = useBookList();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BookStatus | "all">("all");

  const filtered = useMemo(() => {
    let result = books;
    if (filter !== "all") result = result.filter((b) => b.status === filter);
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.genre.toLowerCase().includes(q),
      );
    }
    return result;
  }, [books, filter, query]);

  const counts = useMemo(
    () => ({
      all: books.length,
      reading: books.filter((b) => b.status === "reading").length,
      unread: books.filter((b) => b.status === "unread").length,
      completed: books.filter((b) => b.status === "completed").length,
    }),
    [books],
  );

  if (!isOpen) return null;

  return (
    <>
      <s.div
        position="fixed"
        inset={0}
        zIndex={40}
        bg="black/50"
        onClick={close}
        className={css({ backdropFilter: "blur(4px)" })}
      />

      <s.div
        position="fixed"
        zIndex={50}
        bottom={0}
        left={0}
        right={0}
        maxH="88vh"
        md={{ top: 0, bottom: 0, right: "auto", maxH: "none", w: "80" }}
        display="flex"
        flexDir="column"
        overflow="hidden"
        border="1px solid"
        borderColor="white/8"
        roundedTop="3xl"
        roundedBottom="none"
        shadow="2xl"
        shadowColor="black/50"
        className={css({
          background: "color-mix(in srgb, transparent 15%, #020617 85%)",
          backdropFilter: "blur(20px)",
          md: {
            rounded: "none",
            roundedRight: "3xl",
          },
        })}
      >
        <Flex
          display={{ base: "flex", md: "none" }}
          justify="center"
          pt="3"
          pb="1"
          flexShrink={0}
        >
          <Box w="10" h="1" rounded="full" bg="white/20" />
        </Flex>

        <Flex
          alignItems="center"
          justify="between"
          pt="4"
          pb="3"
          px="4"
          flexShrink={0}
          borderBottom="1px solid"
          borderColor="white/5"
        >
          <Flex alignItems="center" gap="2">
            <Text
              tag="h2"
              fontClass="callout-bold"
              className={css({ color: "white" })}
            >
              本の一覧
            </Text>
            <Text
              tag="span"
              fontClass="capline"
              className={css({
                color: "slate.500",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {counts.all}
            </Text>
          </Flex>
          <CloseButton
            onClick={close}
            className={css({
              position: "absolute!",
              top: "4!",
              right: "4!",
              zIndex: 10,
              "& svg": {
                color: "slate.400!",
              },
              _hover: {
                "& svg": {
                  color: "white!",
                },
              },
            })}
          />
        </Flex>

        <Box pt="3" pb="2" px="4" flexShrink={0}>
          <TextInput
            name="Search"
            placeholder="タイトル・著者で検索..."
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setQuery(e.target.value)
            }
            endIcon={query ? "x" : "search"}
            onEndIconClick={query ? () => setQuery("") : undefined}
          />
        </Box>

        <Box px="4" pb="3" flexShrink={0}>
          <FilterTabs
            activeFilter={filter}
            setFilter={setFilter}
            counts={counts}
            cardMaterial="flat"
          />
        </Box>

        <Box flex={1} overflowY="auto">
          {filtered.length === 0 ? (
            <Flex
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              py="16"
            >
              <Text
                tag="p"
                fontClass="callout"
                className={css({ color: "slate.600" })}
              >
                本が見つかりません
              </Text>
            </Flex>
          ) : (
            filtered.map((book) => (
              <Box
                key={book.id}
                borderBottom="1px solid"
                borderColor="white/4"
                _last={{ borderBottom: "none" }}
              >
                <BookRow book={book} onClick={() => handleSelectBook(book)} />
              </Box>
            ))
          )}
        </Box>
      </s.div>
    </>
  );
}
