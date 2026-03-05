"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Clock,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { css, cva } from "styled-system/css";
import { token } from "styled-system/tokens";
import { Box, Flex, styled as s } from "styled-system/jsx";
import type { Book, ReadingNote } from "@/types/library";
import Card from "~liftkit/card";
import Grid from "~liftkit/grid";
import Text from "~liftkit/text";
import Row from "~liftkit/row";
import Column from "~liftkit/column";
import StatusBadge from "./shares/badge/StatusBadge";
import DeleteBookModal from "@/components/DelBookModal";

const GRAPH_DATA = [3, 8, 5, 12, 20, 15, 7, 25, 18, 30, 22, 10, 28, 35];

const DELTA_BUTTONS = [
  { label: "−10", delta: -10, color: "violet" },
  { label: "−1", delta: -1, color: "white" },
  { label: "+1", delta: 1, color: "white" },
  { label: "+10", delta: 10, color: "indigo" },
] as const;

const deltaButton = cva({
  base: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    h: "32px",
    rounded: "lg",
    fontSize: "xs",
    fontWeight: "semibold",
    transition: "all 0.15s",
    cursor: "pointer",
  },
  variants: {
    color: {
      white: {
        bg: "white/5",
        color: "slate.400",
        _hover: { bg: "white/10", color: "white" },
      },
      violet: {
        bg: "violet.500/10",
        color: "violet.400",
        border: "1px solid",
        borderColor: "violet.500/20",
        _hover: { bg: "violet.500/20", color: "violet.300" },
      },
      indigo: {
        bg: "indigo.500/10",
        color: "indigo.400",
        border: "1px solid",
        borderColor: "indigo.500/20",
        _hover: { bg: "indigo.500/20", color: "indigo.300" },
      },
    },
  },
});

const ItemCard = ({ children }: { children: React.ReactNode }) => (
  <Card
    material="glass"
    variant="transparent"
    scaleFactor="body"
    materialProps={{ thickness: "thin" }}
  >
    {children}
  </Card>
);

function ReadingProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <Column gap="sm">
      <Row alignItems="center" justifyContent="space-between">
        <Text fontClass="caption" color="outline">
          進捗
        </Text>
        <Text fontClass="caption-bold" color="onsurface">
          {pct}%
        </Text>
      </Row>
      <Box w="full" h="8px" rounded="full" bg="white/6" overflow="hidden">
        <Box
          h="full"
          rounded="full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)",
            transition: "width 0.7s ease-out",
          }}
        />
      </Box>
      <Row alignItems="center" justifyContent="space-between">
        <Text fontClass="capline" color="outline">
          {current}ページ
        </Text>
        <Text fontClass="capline" color="outline">
          {total}ページ
        </Text>
      </Row>
    </Column>
  );
}

function MiniGraph() {
  const max = Math.max(...GRAPH_DATA);
  return (
    <Column gap="sm">
      <Row alignItems="center" gap="sm">
        <BarChart3 size={12} color={token("colors.slate.400")} />
        <Text tag="span" fontClass="caption" color="outline">
          Reading Graph
        </Text>
        <Text
          tag="span"
          fontClass="capline"
          color="outline"
          style={{ marginLeft: "auto" }}
        >
          過去14日
        </Text>
      </Row>
      <Row gap="xs" style={{ height: "64px", alignItems: "flex-end" }}>
        {GRAPH_DATA.map((v, i) => {
          const key = `bar-${i}`;
          return (
            <Box
              key={key}
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
      </Row>
    </Column>
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
    if (!Number.isNaN(n)) onSet(bookId, n);
    else setDraft(String(current));
    setFocused(false);
  };

  return (
    <Column
      gap="sm"
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px solid #ffffff0D",
      }}
    >
      <Row gap="md" style={{ alignItems: "center", justifyContent: "center" }}>
        <input
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
            rounded: "xl",
            px: 2,
            py: 2,
            color: "white",
            transition: "all 0.2s",
            _focus: {
              borderColor: "indigo.500/50",
              bg: "white/9",
              outline: "none",
            },
            "&[type=number]": { appearance: "textfield" },
            "&::-webkit-inner-spin-button,&::-webkit-outer-spin-button": {
              display: "none",
            },
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
      </Row>
      <Grid gap="sm" columns={4}>
        {DELTA_BUTTONS.map(({ label, delta, color }) => (
          <s.button
            key={label}
            className={deltaButton({ color })}
            onClick={() => onUpdate(bookId, delta)}
          >
            {label}
          </s.button>
        ))}
      </Grid>
    </Column>
  );
}

function ReadingNotes({
  bookId,
  notes,
  currentPage,
  onAdd,
  onDelete,
}: Readonly<{
  bookId: string;
  notes: ReadingNote[];
  currentPage: number;
  onAdd: (bookId: string, content: string, page: number | null) => void;
  onDelete: (bookId: string, noteId: string) => void;
}>) {
  const [draft, setDraft] = useState("");
  const [linkPage, setLinkPage] = useState(false);

  const submit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(bookId, trimmed, linkPage ? currentPage : null);
    setDraft("");
    setLinkPage(false);
  };

  //

  return (
    <Column gap="sm">
      <Row gap="sm" style={{ alignItems: "center" }}>
        <StickyNote size={12} color={token("colors.slate.400")} />
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
      </Row>

      {notes.length > 0 && (
        <Column
          gap="sm"
          style={{ maxHeight: "192px", overflowY: "auto", paddingRight: "4px" }}
        >
          {notes.map((note) => (
            <Box
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
                })}
                onClick={() => onDelete(bookId, note.id)}
              >
                <Trash2 size={10} />
              </s.button>
            </Box>
          ))}
        </Column>
      )}

      <Column gap="sm">
        <s.textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="メモを入力..."
          rows={3}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          className={css({
            w: "full",
            fontSize: "xs",
            color: "slate.200",
            resize: "none",
            _placeholder: { color: "slate.600" },
            bg: "white/4",
            border: "1px solid",
            borderColor: "white/7",
            rounded: "xl",
            px: 3,
            py: 2.5,
            _focus: {
              borderColor: "indigo.500/40",
              bg: "white/7",
              outline: "none",
            },
          })}
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
              _hover: { bg: "indigo.500/30" },
              _disabled: { opacity: 0.3, cursor: "not-allowed" },
            })}
          >
            <Plus size={11} />
            追加
          </s.button>
        </Flex>
      </Column>
    </Column>
  );
}

// ─── メイン ───────────────────────────────────────────────────────────────────

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
  const [isDelOpen, setIsDelOpen] = useState(false);
  if (!book) return null;

  const metaItems = [
    { icon: <BookOpen size={10} />, label: "ISBN", value: book.isbn || "—" },
    {
      icon: <Clock size={10} />,
      label: "登録日",
      value: book.registeredAt
        ? new Date(book.registeredAt).toLocaleDateString("ja-JP")
        : "—",
    },
  ];

  return (
    <>
      <Box
        position="fixed"
        inset={0}
        zIndex={40}
        onClick={onClose}
        className={css({
          animation: "fadeIn 0.2s ease-out",
          md: { display: "none" },
        })}
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      <DeleteBookModal
        isOpen={isDelOpen}
        bookId={book.id}
        onCloseAction={() => setIsDelOpen(false)}
        onDeleteAction={(id) => {
          onDeleteBook(id);
          setIsDelOpen(false);
          onClose();
        }}
      />

      <Box
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
        {/* アクセントグロー */}
        <Box
          position="absolute"
          top={0}
          right={0}
          w="192px"
          h="128px"
          rounded="full"
          pointerEvents="none"
          style={{ background: `${book.color}20`, filter: "blur(48px)" }}
        />

        {/* ドラッグハンドル（モバイル） */}
        <Box
          display="flex"
          justifyContent="center"
          pt={3}
          pb={1}
          flexShrink={0}
          md={{ display: "none" }}
        >
          <Box w="40px" h="4px" rounded="full" bg="white/20" />
        </Box>

        {/* ヘッダー */}
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

        {/* コンテンツ */}
        <Box flex={1} overflowY="auto" p={5}>
          <Column gap="lg">
            {/* 書籍情報 */}
            <Row alignItems="center" gap="lg">
              <Box position="relative" flexShrink={0}>
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
                    <Box
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
                    <Box
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
              </Box>
              <Box minW={0}>
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
              </Box>
            </Row>

            {/* メタ情報 */}
            <Box display="grid" gridTemplateColumns="repeat(2, 1fr)" gap={3}>
              {metaItems.map(({ icon, label, value }) => (
                <ItemCard key={label}>
                  <Flex align="center" gap={1.5} mb={1}>
                    <s.span color="slate.500" display="flex">
                      {icon}
                    </s.span>
                    <s.span fontSize="10px" color="slate.500">
                      {label}
                    </s.span>
                  </Flex>
                  <Text
                    tag="p"
                    fontClass="caption"
                    className={css({ color: "slate.300" })}
                  >
                    {value}
                  </Text>
                </ItemCard>
              ))}
            </Box>

            {/* 進捗 */}
            <ItemCard>
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
            </ItemCard>

            {/* グラフ */}
            {book.status !== "unread" && (
              <ItemCard>
                <MiniGraph />
              </ItemCard>
            )}

            {/* メモ */}
            <ItemCard>
              <ReadingNotes
                bookId={book.id}
                notes={book.notes}
                currentPage={book.currentPage}
                onAdd={onAddNote}
                onDelete={onDeleteNote}
              />
            </ItemCard>

            {/* 削除 */}
            <Box pt={2} pb={1}>
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
                onClick={() => setIsDelOpen(true)}
              >
                <Trash2 size={13} />
                この本を削除
              </s.button>
            </Box>
          </Column>
        </Box>
      </Box>
    </>
  );
}
