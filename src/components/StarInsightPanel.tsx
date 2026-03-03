"use client";

import {
  BarChart3,
  BookOpen,
  Clock,
  Plus,
  StickyNote,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { Flex, Stack, styled as s } from "styled-system/jsx";
import type { Book, ReadingNote } from "@/types/library";
import Card from "~liftkit/card";
import Grid from "~liftkit/grid";
import Text from "~liftkit/text";
import StatusBadge from "./shares/badge/StatusBadge";

function ReadingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <Stack gap={2}>
      <Flex align="center" justify="space-between">
        <Text
          tag="span"
          fontClass="caption"
          className={css({ color: "slate.400" })}
        >
          進捗
        </Text>
        <Text
          tag="span"
          fontClass="caption-bold"
          className={css({
            color: "slate.200",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          {pct}%
        </Text>
      </Flex>
      <s.div w="full" h="8px" rounded="full" bg="white/6" overflow="hidden">
        <s.div
          h="full"
          rounded="full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
            transition: "width 0.7s ease-out",
          }}
        />
      </s.div>
      <Flex justify="space-between">
        <Text
          tag="span"
          fontClass="capline"
          className={css({ color: "slate.500" })}
        >
          {current}ページ
        </Text>
        <Text
          tag="span"
          fontClass="capline"
          className={css({ color: "slate.500" })}
        >
          {total}ページ
        </Text>
      </Flex>
    </Stack>
  );
}

function MiniGraph() {
  const data = [3, 8, 5, 12, 20, 15, 7, 25, 18, 30, 22, 10, 28, 35];
  const max = Math.max(...data);
  return (
    <Stack gap={2}>
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={1.5}>
          <s.span color="slate.400" display="flex">
            <BarChart3 size={12} />
          </s.span>
          <Text
            tag="span"
            fontClass="caption"
            className={css({ color: "slate.400" })}
          >
            Reading Graph
          </Text>
        </Flex>
        <Text
          tag="span"
          fontClass="capline"
          className={css({ color: "slate.500" })}
        >
          過去14日
        </Text>
      </Flex>
      <Flex align="flex-end" gap="3px" h="64px">
        {data.map((v, _i) => {
          const barKey = `bar-${v}-${_i}`;
          return (
            <s.div
              key={barKey}
              flex={1}
              rounded="sm"
              style={{
                height: `${(v / max) * 100}%`,
                background: "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)",
                opacity: 0.4 + (v / max) * 0.6,
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </Flex>
    </Stack>
  );
}

function PageControls({
  bookId,
  current,
  total,
  onUpdate,
  onSet,
}: {
  bookId: string;
  current: number;
  total: number;
  onUpdate: (bookId: string, delta: number) => void;
  onSet: (bookId: string, page: number) => void;
}) {
  const [draft, setDraft] = useState(String(current));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(current));
  }, [current, focused]);

  const commit = () => {
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) {
      onSet(bookId, n);
    } else {
      setDraft(String(current));
    }
    setFocused(false);
  };

  return (
    <Stack gap={3} mt={3} pt={3} borderTop="1px solid" borderColor="white/5">
      <Flex align="center" justify="center" gap={3}>
        <s.input
          type="number"
          value={draft}
          min={0}
          max={total}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={commit}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          className={css({
            w: "96px",
            textAlign: "center",
            fontSize: "2xl",
            fontWeight: "bold",
            fontVariantNumeric: "tabular-nums",
            bg: "white/6",
            border: "1px solid",
            borderColor: "white/10",
            _focus: {
              borderColor: "indigo.500/50",
              bg: "white/9",
              outline: "none",
            },
            rounded: "xl",
            px: 2,
            py: 2,
            color: "white",
            transition: "all 0.2s",
            "&[type=number]": {
              appearance: "textfield",
            },
            "&::-webkit-inner-spin-button": { display: "none" },
            "&::-webkit-outer-spin-button": { display: "none" },
          })}
        />
        <Text
          tag="span"
          fontClass="callout"
          className={css({
            color: "slate.500",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          / {total}p
        </Text>
      </Flex>

      <Grid gap="sm" columns={4}>
        <s.button
          onClick={() => onUpdate(bookId, -10)}
          cursor="pointer"
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            h: "32px",
            rounded: "lg",
            fontSize: "xs",
            fontWeight: "semibold",
            transition: "all 0.15s",
            bg: "violet.500/10",
            border: "1px solid",
            borderColor: "violet.500/20",
            color: "violet.400",
            cursor: "pointer",
            _hover: { bg: "violet.500/20", color: "violet.300" },
          })}
        >
          −10
        </s.button>
        <s.button
          onClick={() => onUpdate(bookId, -1)}
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            h: "32px",
            rounded: "lg",
            fontSize: "xs",
            fontWeight: "semibold",
            transition: "all 0.15s",
            bg: "white/5",
            color: "slate.400",
            cursor: "pointer",
            _hover: { bg: "white/10", color: "white" },
          })}
        >
          −1
        </s.button>
        <s.button
          onClick={() => onUpdate(bookId, 1)}
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            h: "32px",
            rounded: "lg",
            fontSize: "xs",
            fontWeight: "semibold",
            transition: "all 0.15s",
            bg: "white/5",
            color: "slate.400",
            cursor: "pointer",
            _hover: { bg: "white/10", color: "white" },
          })}
        >
          +1
        </s.button>
        <s.button
          onClick={() => onUpdate(bookId, 10)}
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            h: "32px",
            rounded: "lg",
            fontSize: "xs",
            fontWeight: "semibold",
            transition: "all 0.15s",
            bg: "indigo.500/10",
            border: "1px solid",
            borderColor: "indigo.500/20",
            color: "indigo.400",
            cursor: "pointer",
            _hover: { bg: "indigo.500/20", color: "indigo.300" },
          })}
        >
          +10
        </s.button>
      </Grid>
    </Stack>
  );
}

function ReadingNotes({
  bookId,
  notes,
  currentPage,
  onAdd,
  onDelete,
}: {
  bookId: string;
  notes: ReadingNote[];
  currentPage: number;
  onAdd: (bookId: string, content: string, page: number | null) => void;
  onDelete: (bookId: string, noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [linkPage, setLinkPage] = useState(false);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(bookId, trimmed, linkPage ? currentPage : null);
    setDraft("");
    setLinkPage(false);
  };

  return (
    <Stack gap={3}>
      <Flex align="center" gap={1.5}>
        <s.span color="slate.400" display="flex">
          <StickyNote size={12} />
        </s.span>
        <Text
          tag="span"
          fontClass="caption"
          className={css({ color: "slate.400" })}
        >
          読書メモ
        </Text>
        {notes.length > 0 && (
          <Text
            tag="span"
            fontClass="capline"
            className={css({
              ml: "auto",
              color: "slate.600",
              fontVariantNumeric: "tabular-nums",
            })}
          >
            {notes.length}件
          </Text>
        )}
      </Flex>

      {notes.length > 0 && (
        <Stack gap={2} maxH="192px" overflowY="auto" pr={1}>
          {notes.map((note) => (
            <s.div
              key={note.id}
              position="relative"
              p={3}
              rounded="xl"
              bg="white/3"
              border="1px solid"
              borderColor="white/5"
              className={css({
                _hover: { borderColor: "white/10" },
                transition: "border-color 0.15s",
              })}
              style={{ ["--group" as string]: "1" }}
            >
              <s.p
                fontSize="xs"
                color="slate.300"
                lineHeight="relaxed"
                pr={5}
                whiteSpace="pre-wrap"
              >
                {note.content}
              </s.p>
              <Flex align="center" gap={2} mt={1.5}>
                <s.span fontSize="10px" color="slate.600">
                  {note.createdAt}
                </s.span>
                {note.page !== null && (
                  <s.span
                    fontSize="10px"
                    color="indigo.500/70"
                    fontVariantNumeric="tabular-nums"
                  >
                    p.{note.page}
                  </s.span>
                )}
              </Flex>
              <s.button
                position="absolute"
                top={2}
                right={2}
                p={1}
                rounded="lg"
                color="slate.600"
                cursor="pointer"
                className={css({
                  transition: "all 0.15s",
                  _hover: { color: "red.400", bg: "red.500/10" },
                  opacity: 0,
                  "&:focus-visible": { opacity: 1 },
                  ".group:hover &": { opacity: 1 },
                })}
                onClick={() => onDelete(bookId, note.id)}
              >
                <Trash2 size={10} />
              </s.button>
            </s.div>
          ))}
        </Stack>
      )}

      <Stack gap={2}>
        <s.textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="メモを入力..."
          rows={3}
          className={css({
            w: "full",
            fontSize: "xs",
            color: "slate.200",
            _placeholder: { color: "slate.600" },
            bg: "white/4",
            border: "1px solid",
            borderColor: "white/7",
            _focus: {
              borderColor: "indigo.500/40",
              bg: "white/7",
              outline: "none",
            },
            rounded: "xl",
            px: 3,
            py: 2.5,
            resize: "none",
            transition: "all 0.2s",
          })}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
        />
        <Flex align="center" justify="space-between">
          <s.label
            display="flex"
            alignItems="center"
            gap={1.5}
            cursor="pointer"
          >
            <s.input
              type="checkbox"
              checked={linkPage}
              onChange={(e) => setLinkPage(e.target.checked)}
              w="12px"
              h="12px"
              rounded="sm"
              accentColor="#6366f1"
            />
            <s.span fontSize="10px" color="slate.500">
              現在のページ ({currentPage}p) を紐付け
            </s.span>
          </s.label>
          <s.button
            onClick={submit}
            disabled={!draft.trim()}
            className={css({
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 3,
              py: 1.5,
              rounded: "lg",
              bg: "indigo.500/20",
              border: "1px solid",
              borderColor: "indigo.500/30",
              color: "indigo.300",
              fontSize: "11px",
              fontWeight: "medium",
              cursor: "pointer",
              transition: "all 0.15s",
              _hover: { bg: "indigo.500/30" },
              _disabled: { opacity: 0.3, cursor: "not-allowed" },
            })}
          >
            <Plus size={11} />
            追加
          </s.button>
        </Flex>
      </Stack>
    </Stack>
  );
}

function DeleteBookButton({
  bookId,
  onDelete,
}: {
  bookId: string;
  onDelete: (bookId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <s.div
        p={4}
        rounded="2xl"
        border="1px solid"
        borderColor="red.500/20"
        className={css({
          bg: "red.500/6",
          animation: "fadeIn 0.15s ease-out",
        })}
      >
        <s.p fontSize="xs" color="red.300" mb={3} textAlign="center">
          この本を削除しますか？
          <s.br />
          <s.span color="slate.500">この操作は取り消せません</s.span>
        </s.p>
        <Flex gap={2}>
          <s.button
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="medium"
            cursor="pointer"
            className={css({
              bg: "white/5",
              border: "1px solid",
              borderColor: "white/10",
              color: "slate.400",
              transition: "all 0.15s",
              _hover: { bg: "white/10", color: "white" },
            })}
            onClick={() => setConfirming(false)}
          >
            キャンセル
          </s.button>
          <s.button
            flex={1}
            py={2.5}
            rounded="xl"
            fontSize="xs"
            fontWeight="semibold"
            cursor="pointer"
            className={css({
              bg: "red.500/15",
              border: "1px solid",
              borderColor: "red.500/30",
              color: "red.400",
              transition: "all 0.15s",
              _hover: { bg: "red.500/25", color: "red.300" },
            })}
            onClick={() => onDelete(bookId)}
          >
            削除する
          </s.button>
        </Flex>
      </s.div>
    );
  }

  return (
    <s.button
      w="full"
      py={2.5}
      rounded="xl"
      fontSize="xs"
      fontWeight="medium"
      cursor="pointer"
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap={1.5}
      className={css({
        bg: "transparent",
        border: "1px solid",
        borderColor: "white/8",
        color: "slate.600",
        transition: "all 0.2s",
        _hover: {
          bg: "red.500/8",
          borderColor: "red.500/20",
          color: "red.500",
        },
      })}
      onClick={() => setConfirming(true)}
    >
      <Trash2 size={13} />
      この本を削除
    </s.button>
  );
}

export default function StarInsightPanel({
  book,
  onClose,
  onPageUpdate,
  onPageSet,
  onAddNote,
  onDeleteNote,
  onDeleteBook,
}: {
  book: Book | null;
  onClose: () => void;
  onPageUpdate: (bookId: string, delta: number) => void;
  onPageSet: (bookId: string, page: number) => void;
  onAddNote: (bookId: string, content: string, page: number | null) => void;
  onDeleteNote: (bookId: string, noteId: string) => void;
  onDeleteBook: (bookId: string) => void;
}) {
  if (!book) return null;

  return (
    <>
      <s.div
        position="fixed"
        inset={0}
        zIndex={40}
        className={css({
          animation: "fadeIn 0.2s ease-out",
          md: { display: "none" },
        })}
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      <s.div
        position="fixed"
        zIndex={50}
        bottom={0}
        left={0}
        right={0}
        maxH="82vh"
        roundedTop="3xl"
        md={{
          top: 4,
          right: 4,
          bottom: 4,
          left: "auto",
          w: "22rem",
          maxH: "none",
          rounded: "3xl",
        }}
        display="flex"
        flexDir="column"
        className={css({
          animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        })}
        style={{
          background: "rgba(255, 255, 255, 0.07)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
        }}
      >
        <s.div
          position="absolute"
          top={0}
          right={0}
          w="192px"
          h="128px"
          rounded="full"
          pointerEvents="none"
          style={{
            background: `${book.color}20`,
            filter: "blur(48px)",
          }}
        />

        <s.div
          display="flex"
          justifyContent="center"
          pt={3}
          pb={1}
          flexShrink={0}
          md={{ display: "none" }}
        >
          <s.div w="40px" h="4px" rounded="full" bg="white/20" />
        </s.div>

        <Flex
          position="relative"
          align="center"
          justify="space-between"
          px={5}
          pt={3}
          pb={0}
          flexShrink={0}
        >
          <StatusBadge status={book.status} />
          <s.button
            onClick={onClose}
            p={2}
            rounded="xl"
            color="slate.400"
            cursor="pointer"
            className={css({
              transition: "all 0.2s",
              _hover: { color: "white", bg: "white/10" },
            })}
          >
            <X size={16} />
          </s.button>
        </Flex>

        <s.div flex={1} overflowY="auto" p={5}>
          <Stack gap={6}>
            <Flex align="center" gap={4}>
              <s.div position="relative" flexShrink={0}>
                {book.coverUrl ? (
                  <Image
                    src={book.coverUrl.replace("http://", "https://")}
                    alt={book.title}
                    width={48}
                    height={68}
                    className={css({
                      rounded: "lg",
                      objectFit: "cover",
                      mx: 2,
                      my: 2,
                    })}
                    style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}
                  />
                ) : (
                  <>
                    <s.div
                      w="64px"
                      h="64px"
                      rounded="full"
                      position="absolute"
                      inset={0}
                      style={{
                        background: `${book.color}30`,
                        filter: "blur(12px)",
                      }}
                    />
                    <s.div
                      w="48px"
                      h="48px"
                      rounded="full"
                      position="relative"
                      mx={2}
                      my={2}
                      style={{
                        background: `radial-gradient(circle at 35% 35%, white, ${book.color})`,
                      }}
                    />
                  </>
                )}
              </s.div>
              <s.div minW={0}>
                <s.h2
                  fontSize="base"
                  fontWeight="semibold"
                  color="white"
                  lineHeight="tight"
                  mb={0.5}
                >
                  {book.title}
                </s.h2>
                <s.p fontSize="xs" color="slate.400">
                  {book.author}
                </s.p>
              </s.div>
            </Flex>

            <s.div display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3}>
              <Card
                material="glass"
                variant="transparent"
                scaleFactor="caption"
                materialProps={{ thickness: "thin" }}
              >
                <Flex align="center" gap={1.5} mb={1}>
                  <s.span color="slate.500" display="flex">
                    <BookOpen size={10} />
                  </s.span>
                  <s.span fontSize="10px" color="slate.500">
                    ISBN
                  </s.span>
                </Flex>
                <Text
                  tag="p"
                  fontClass="caption"
                  className={css({
                    color: "slate.300",
                  })}
                >
                  {book.isbn || "—"}
                </Text>
              </Card>
              <Card
                material="glass"
                variant="transparent"
                scaleFactor="caption"
                materialProps={{ thickness: "thin" }}
              >
                <Flex align="center" gap={1.5} mb={1}>
                  <s.span color="slate.500" display="flex">
                    <Clock size={10} />
                  </s.span>
                  <s.span fontSize="10px" color="slate.500">
                    登録日
                  </s.span>
                </Flex>
                <Text
                  tag="p"
                  fontClass="caption"
                  className={css({ color: "slate.300" })}
                >
                  {book.registeredAt
                    ? new Date(book.registeredAt).toLocaleDateString("ja-JP")
                    : "—"}
                </Text>
              </Card>
            </s.div>

            <Card
              material="glass"
              variant="transparent"
              scaleFactor="body"
              materialProps={{ thickness: "thin" }}
            >
              <ReadingProgress
                current={book.currentPage}
                total={book.totalPages}
              />
              <PageControls
                bookId={book.id}
                current={book.currentPage}
                total={book.totalPages}
                onUpdate={onPageUpdate}
                onSet={onPageSet}
              />
            </Card>

            {book.status !== "unread" && (
              <Card
                material="glass"
                variant="transparent"
                scaleFactor="body"
                materialProps={{ thickness: "thin" }}
              >
                <MiniGraph />
              </Card>
            )}

            <s.div>
              <Flex align="center" gap={1.5} mb={3}>
                <s.span color="slate.400" display="flex">
                  <Tag size={12} />
                </s.span>
                <Text
                  tag="span"
                  fontClass="caption"
                  className={css({ color: "slate.400" })}
                >
                  Nebula Tags
                </Text>
              </Flex>
              <Flex wrap="wrap" gap={2}>
                <s.span
                  px={3}
                  py={1}
                  rounded="lg"
                  bg="violet.500/10"
                  border="1px solid"
                  borderColor="violet.500/20"
                  fontSize="10px"
                  fontWeight="medium"
                  color="violet.400"
                >
                  {book.genre}
                </s.span>
                {book.status === "completed" && (
                  <s.span
                    px={3}
                    py={1}
                    rounded="lg"
                    bg="blue.500/10"
                    border="1px solid"
                    borderColor="blue.500/20"
                    fontSize="10px"
                    fontWeight="medium"
                    color="blue.400"
                  >
                    星座確定
                  </s.span>
                )}
                {book.status === "reading" && (
                  <s.span
                    px={3}
                    py={1}
                    rounded="lg"
                    bg="emerald.500/10"
                    border="1px solid"
                    borderColor="emerald.500/20"
                    fontSize="10px"
                    fontWeight="medium"
                    color="emerald.400"
                  >
                    またたき中
                  </s.span>
                )}
              </Flex>
            </s.div>

            <Card
              material="glass"
              variant="transparent"
              scaleFactor="body"
              materialProps={{ thickness: "thin" }}
            >
              <ReadingNotes
                bookId={book.id}
                notes={book.notes}
                currentPage={book.currentPage}
                onAdd={onAddNote}
                onDelete={onDeleteNote}
              />
            </Card>

            {/* 破壊的操作はコンテンツ末尾に分離 */}
            <s.div pt={2} pb={1}>
              <DeleteBookButton bookId={book.id} onDelete={onDeleteBook} />
            </s.div>
          </Stack>
        </s.div>
      </s.div>
    </>
  );
}
