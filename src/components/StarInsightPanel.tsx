import {
  BarChart3,
  BookOpen,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { css, cva } from "styled-system/css";
import { Box, Flex, styled as s } from "styled-system/jsx";
import { token } from "styled-system/tokens";
import BookEditModal from "@/components/BookEditModal";
import DeleteBookModal from "@/components/DelBookModal";
import styles from "@/components/observatory.module.css";
import type {
  Book,
  ReadingLog,
  ReadingNote,
  ReadingStats,
} from "@/types/library";
import Column from "~liftkit/column";
import Grid from "~liftkit/grid";
import Row from "~liftkit/row";
import Text from "~liftkit/text";

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
    h: "44px",
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

function ReadingProgress({
  current,
  total,
  status,
}: {
  current: number;
  total: number;
  status: string;
}) {
  const pct =
    total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <>
      <div className={styles.progressMeta}>
        <span>
          {status}　{pct}%
        </span>
        <span>
          {current} / {total > 0 ? total : "未設定"} ページ
        </span>
      </div>
      <progress
        className={styles.progress}
        value={pct}
        max={100}
        aria-label="読書進捗"
      >
        {pct}%
      </progress>
    </>
  );
}

function MiniGraph({ stats }: { stats: ReadingStats }) {
  const data = stats.days;
  const graphData =
    data.length > 0
      ? data
      : Array.from({ length: 14 }, (_, index) => ({
          date: `未記録-${index}`,
          pagesRead: 0,
          readingDay: undefined,
        }));
  const max = Math.max(...graphData.map((day) => day.pagesRead), 1);
  const hasData = data.some((day) => day.pagesRead > 0);

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
        {graphData.map((day) => {
          return (
            <Box
              key={day.readingDay ?? day.date}
              flex={1}
              rounded="sm"
              title={`${day.date}: ${day.pagesRead}ページ`}
              style={{
                height:
                  day.pagesRead > 0 ? `${(day.pagesRead / max) * 100}%` : "2px",
                background:
                  day.pagesRead > 0
                    ? "linear-gradient(180deg, #818cf8 0%, #6366f1 100%)"
                    : "rgba(255,255,255,0.06)",
                opacity:
                  day.pagesRead > 0 ? 0.4 + (day.pagesRead / max) * 0.6 : 1,
                transition: "all 0.3s",
              }}
            />
          );
        })}
      </Row>
      {!hasData && (
        <Text tag="span" fontClass="capline" color="outline">
          まだ記録がありません
        </Text>
      )}
      <Row alignItems="center" justifyContent="space-between">
        <Text tag="span" fontClass="capline" color="outline">
          タイムゾーン: {stats.readingTimezone ?? "未設定"}
        </Text>
        <Text tag="span" fontClass="caption-bold" color="onsurface">
          連続 {stats.streak}日
        </Text>
      </Row>
    </Column>
  );
}

function ReadingLogEditor({
  logs,
  onUpdate,
  onDelete,
}: Readonly<{
  logs: ReadingLog[];
  onUpdate: (
    date: string,
    pagesRead: number,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => void;
  onDelete: (
    date: string,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => void;
}>) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(
      Object.fromEntries(logs.map((log) => [log.id, String(log.pagesRead)])),
    );
  }, [logs]);

  return (
    <Column gap="sm">
      <Row alignItems="center" gap="sm">
        <Text tag="span" fontClass="caption" color="outline">
          読書ログを訂正
        </Text>
        <Text
          tag="span"
          fontClass="capline"
          color="outline"
          style={{ marginLeft: "auto" }}
        >
          対象日のみ
        </Text>
      </Row>
      {logs.length === 0 ? (
        <Text tag="span" fontClass="capline" color="outline">
          この本の記録はありません
        </Text>
      ) : (
        <Column gap="xs" style={{ maxHeight: "160px", overflowY: "auto" }}>
          {[...logs].reverse().map((log) => (
            <Row key={log.id} alignItems="center" gap="sm">
              <Text
                tag="span"
                fontClass="capline"
                color="outline"
                style={{ minWidth: "88px" }}
              >
                {log.date}
                {log.readingDay !== null && log.readingDay !== undefined
                  ? ` · #${log.readingDay}${
                      log.readingTimezoneRevision !== undefined
                        ? ` / 世代${log.readingTimezoneRevision}`
                        : ""
                    }`
                  : " · 旧ログ"}
              </Text>
              <input
                type="number"
                min={0}
                value={drafts[log.id] ?? String(log.pagesRead)}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [log.id]: event.target.value,
                  }))
                }
                onBlur={() => {
                  const value = Number.parseInt(drafts[log.id] ?? "", 10);
                  if (
                    Number.isInteger(value) &&
                    value >= 0 &&
                    value !== log.pagesRead
                  ) {
                    onUpdate(
                      log.date,
                      value,
                      log.readingDay,
                      log.readingTimezoneRevision,
                    );
                  }
                }}
                className={css({
                  flex: 1,
                  minW: 0,
                  px: 2,
                  py: 1,
                  rounded: "lg",
                  bg: "white/5",
                  border: "1px solid",
                  borderColor: "white/8",
                  color: "slate.200",
                  fontSize: "xs",
                })}
                aria-label={`${log.date} ${log.readingDay ?? "旧ログ"}の読書量`}
              />
              <Text tag="span" fontClass="capline" color="outline">
                p
              </Text>
              <s.button
                type="button"
                onClick={() =>
                  onDelete(
                    log.date,
                    log.readingDay,
                    log.readingTimezoneRevision,
                  )
                }
                aria-label={`${log.date} ${log.readingDay ?? "旧ログ"}の読書ログを削除`}
                className={css({
                  color: "slate.600",
                  cursor: "pointer",
                  _hover: { color: "red.400" },
                })}
              >
                <Trash2 size={11} />
              </s.button>
            </Row>
          ))}
        </Column>
      )}
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
          max={total > 0 ? total : undefined}
          aria-label="現在のページ"
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
  onAdd: (
    bookId: string,
    content: string,
    page: number | null,
  ) => Promise<boolean>;
  onDelete: (bookId: string, noteId: string) => void;
}>) {
  const [draft, setDraft] = useState("");
  const [linkPage, setLinkPage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async () => {
    const trimmed = draft.trim();
    if (!trimmed || isSaving) return;
    setIsSaving(true);
    const saved = await onAdd(
      bookId,
      trimmed,
      linkPage && currentPage > 0 ? currentPage : null,
    );
    setIsSaving(false);
    if (!saved) return;
    setDraft("");
    setLinkPage(false);
  };

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
                <s.span fontSize="11px" color="slate.400">
                  {new Date(note.createdAt).toLocaleString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </s.span>
                {note.page !== null && (
                  <s.span
                    fontSize="11px"
                    color="indigo.200"
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
                aria-label="読書メモを削除"
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
          disabled={isSaving}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="読書メモ"
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
              checked={linkPage && currentPage > 0}
              disabled={currentPage < 1 || isSaving}
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
            disabled={!draft.trim() || isSaving}
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
  onUpdateBook,
  onPageUpdate,
  onPageSet,
  onAddNote,
  onDeleteNote,
  onArchiveBook,
  onPermanentlyDeleteBook,
  readingStats,
  readingLogs,
  onUpdateReadingLog,
  onDeleteReadingLog,
}: {
  book: Book | null;
  onClose: () => void;
  onUpdateBook: (bookId: string, updates: Partial<Book>) => void;
  onPageUpdate: (bookId: string, delta: number) => void;
  onPageSet: (bookId: string, page: number) => void;
  onAddNote: (
    bookId: string,
    content: string,
    page: number | null,
  ) => Promise<boolean>;
  onDeleteNote: (bookId: string, noteId: string) => void;
  onArchiveBook: (bookId: string) => void;
  onPermanentlyDeleteBook: (bookId: string) => void;
  readingStats: ReadingStats;
  readingLogs: ReadingLog[];
  onUpdateReadingLog: (
    bookId: string,
    date: string,
    pagesRead: number,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => void;
  onDeleteReadingLog: (
    bookId: string,
    date: string,
    readingDay?: number | null,
    readingTimezoneRevision?: number,
  ) => void;
}) {
  const [isDelOpen, setIsDelOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  useEffect(() => {
    if (!book || isEditOpen || isDelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [book, isEditOpen, isDelOpen, onClose]);

  useEffect(() => {
    if (isRecording) progressRef.current?.scrollIntoView({ block: "nearest" });
  }, [isRecording]);

  if (!book) return null;
  const statusLabel = { unread: "未読", reading: "読書中", completed: "読了" }[
    book.status
  ];

  return (
    <>
      <DeleteBookModal
        isOpen={isDelOpen}
        bookId={book.id}
        onCloseAction={() => setIsDelOpen(false)}
        onArchiveAction={(id) => {
          onArchiveBook(id);
          setIsDelOpen(false);
          onClose();
        }}
        onPermanentDeleteAction={(id) => {
          onPermanentlyDeleteBook(id);
          setIsDelOpen(false);
          onClose();
        }}
      />
      {isEditOpen && (
        <BookEditModal
          isOpen={isEditOpen}
          book={book}
          onCloseAction={() => setIsEditOpen(false)}
          onSaveAction={(id, updates) => {
            onUpdateBook(id, updates);
            setIsEditOpen(false);
          }}
        />
      )}
      <section
        className={styles.panel}
        data-expanded={isRecording || isNotesOpen}
        aria-labelledby="selected-book-title"
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.iconButton} ${styles.panelClose}`}
          onClick={onClose}
          aria-label="パネルを閉じる"
        >
          <X size={18} />
        </button>
        <div className={styles.bookHeader}>
          {book.coverUrl ? (
            <Image
              src={book.coverUrl.replace("http://", "https://")}
              alt={`${book.title}の書影`}
              width={92}
              height={126}
              className={styles.cover}
            />
          ) : (
            <div
              className={`${styles.cover} ${styles.coverFallback}`}
              role="img"
              aria-label="書影なし"
            >
              <BookOpen size={32} />
            </div>
          )}
          <div>
            <h2 id="selected-book-title" className={styles.bookTitle}>
              {book.title}
            </h2>
            <p className={styles.bookAuthor}>{book.author || "著者未設定"}</p>
          </div>
        </div>
        <ReadingProgress
          current={book.currentPage}
          total={book.totalPages}
          status={statusLabel}
        />
        <button
          type="button"
          className={`${styles.primaryButton} ${styles.recordButton}`}
          aria-expanded={isRecording}
          aria-controls="reading-progress-controls"
          onClick={() => setIsRecording((value) => !value)}
        >
          <Pencil size={20} />
          読書を記録する
        </button>
        <div className={styles.secondaryActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            aria-expanded={isNotesOpen}
            aria-controls="reading-notes"
            onClick={() => setIsNotesOpen((value) => !value)}
          >
            <BookOpen size={18} />
            メモ
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil size={18} />
            編集
          </button>
        </div>
        <div
          ref={progressRef}
          id="reading-progress-controls"
          hidden={!isRecording}
        >
          <PageControls
            key={book.id}
            bookId={book.id}
            current={book.currentPage}
            total={book.totalPages}
            onUpdate={onPageUpdate}
            onSet={onPageSet}
          />
        </div>
        <div
          id="reading-notes"
          hidden={!isNotesOpen}
          className={styles.expandedSection}
        >
          <ReadingNotes
            key={book.id}
            bookId={book.id}
            notes={book.notes}
            currentPage={book.currentPage}
            onAdd={onAddNote}
            onDelete={onDeleteNote}
          />
        </div>
        <details className={styles.moreDetails}>
          <summary>読書の記録・書籍情報</summary>
          <Column gap="lg">
            <MiniGraph stats={readingStats} />
            <ReadingLogEditor
              logs={readingLogs}
              onUpdate={(date, pages, day, revision) =>
                onUpdateReadingLog(book.id, date, pages, day, revision)
              }
              onDelete={(date, day, revision) =>
                onDeleteReadingLog(book.id, date, day, revision)
              }
            />
            <p>ISBN: {book.isbn || "未設定"}</p>
            <p>
              登録日: {new Date(book.registeredAt).toLocaleDateString("ja-JP")}
            </p>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setIsDelOpen(true)}
            >
              <Trash2 size={16} />
              この本をアーカイブ
            </button>
          </Column>
        </details>
      </section>
    </>
  );
}
