"use client";

import { ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { css, cx } from "styled-system/css";
import { Box, Flex, HStack, Stack } from "styled-system/jsx";
import useLibraryStore from "@/store/useLibraryStore";
import type { Book } from "@/types/library";
import Card from "~liftkit/card";
import Text from "~liftkit/text";

interface MiniProgressProps {
  current: number;
  total: number;
}

interface BottomDockProps {
  nowReading: Book[];
  onQuickAdd: (bookId: string) => void;
  onBookClick: (book: Book) => void;
}

function MiniProgress({ current, total }: MiniProgressProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <Box width="full" height="1" rounded="full" bg="white/8" overflow="hidden">
      <Box
        height="full"
        rounded="full"
        transition="all"
        transitionDuration="500ms"
        style={{
          width: `${percentage}%`,
          background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
        }}
      />
    </Box>
  );
}

function ReadingCard({
  book,
  onQuickAdd,
  onClick,
}: {
  book: Book;
  onQuickAdd: () => void;
  onClick: () => void;
}) {
  return (
    <Card
      material="flat"
      variant="outline"
      scaleFactor="caption"
      isClickable
      onClick={onClick}
      className={cx(
        "group",
        css({
          w: { base: "40", md: "48" },
          flexShrink: 0,
          position: "relative",
          zIndex: 0,
          _hover: {
            bg: "white/4",
            zIndex: 1,
          },
        }),
      )}
    >
      <Stack gap="2" alignItems="stretch">
        <Flex justify="between" alignItems="center">
          <Box minWidth={0}>
            <Text
              tag="p"
              fontClass="caption-bold"
              className={css({ color: "slate.200", truncate: true })}
            >
              {book.title}
            </Text>
            <Text
              tag="p"
              fontClass="capline"
              className={css({ color: "slate.500", truncate: true })}
            >
              {book.author}
            </Text>
          </Box>
          <ChevronRight
            size={12}
            className={css({
              color: "slate.600",
              transition: "colors",
              flexShrink: 0,
              ml: "1",
              _groupHover: { color: "slate.400" },
            })}
          />
        </Flex>

        <MiniProgress current={book.currentPage} total={book.totalPages} />

        <Flex justify="between" alignItems="center">
          <Text
            tag="span"
            fontClass="capline"
            className={css({
              fontVariantNumeric: "tabular-nums",
              color: "slate.500",
            })}
          >
            {book.currentPage}/{book.totalPages}p
          </Text>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd();
            }}
            className={css({
              fontSize: "10px",
              fontWeight: "semibold",
              color: "indigo.400",
              px: "2",
              py: "0.5",
              rounded: "md",
              bg: "indigo.500/10",
              cursor: "pointer",
              transition: "all",
              transitionDuration: "200ms",
              _hover: {
                color: "indigo.300",
                bg: "indigo.500/20",
              },
            })}
          >
            +1P
          </button>
        </Flex>
      </Stack>
    </Card>
  );
}

export default function BottomDock({
  nowReading,
  onQuickAdd,
  onBookClick,
}: BottomDockProps) {
  const setBottomDockVisible = useLibraryStore((s) => s.setBottomDockVisible);

  useEffect(() => {
    setBottomDockVisible(nowReading.length > 0);
  }, [nowReading.length, setBottomDockVisible]);

  if (nowReading.length === 0) return null;

  return (
    <Box
      position="fixed"
      zIndex={30}
      bottom={0}
      left={0}
      right={0}
      md={{
        bottom: "6",
        left: "50%",
        transform: "translateX(-50%)",
        right: "auto",
      }}
    >
      <Card
        material="glass"
        variant="outline"
        scaleFactor="caption"
        materialProps={{ thickness: "thin" }}
        className={css({
          borderTopRadius: "2xl",
          md: { rounded: "2xl" },
          shadow: "2xl",
          shadowColor: "black/30",
        })}
      >
        <Flex display={{ base: "flex", md: "none" }} justify="center" mb="2">
          <Box w="8" h="1" rounded="full" bg="white/20" />
        </Flex>

        <HStack alignItems="stretch" gap={{ base: "2", md: "3" }}>
          <Flex
            display={{ base: "none", md: "flex" }}
            alignItems="center"
            px="2"
            borderRight="1px solid"
            borderColor="white/8"
          >
            <Text
              tag="span"
              fontClass="capline"
              className={css({
                fontWeight: "semibold",
                letterSpacing: "widest",
                textTransform: "uppercase",
                color: "slate.500",
                whiteSpace: "nowrap",
              })}
            >
              Now Reading
            </Text>
          </Flex>

          <HStack
            gap={{ base: "2", md: "3" }}
            pb="1"
            className={css({ scrollbar: "hidden" })}
          >
            {nowReading.slice(0, 3).map((book) => (
              <ReadingCard
                key={book.id}
                book={book}
                onQuickAdd={() => onQuickAdd(book.id)}
                onClick={() => onBookClick(book)}
              />
            ))}
          </HStack>
        </HStack>
      </Card>
    </Box>
  );
}
