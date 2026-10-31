import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { css } from "styled-system/css";
import { Box, Flex, styled as s } from "styled-system/jsx";
import { token } from "styled-system/tokens";
import BookEditModal from "@/components/BookEditModal";
import DeleteBookModal from "@/components/DelBookModal";
import styles from "@/components/observatory.module.css";
import CloseButton from "@/components/shares/CloseButton";
import Modal from "@/components/shares/modal/Modal";
import progressStyles from "@/components/star-insight-progress.module.css";
import useBookListStore from "@/store/useBookListStore";
import useProgressPreviewStore from "@/store/useProgressPreviewStore";
import type {
  Book,
  ReadingLog,
  ReadingNote,
  ReadingStats,
} from "@/types/library";
import Column from "~liftkit/column";
import Row from "~liftkit/row";
import Text from "~liftkit/text";

const MAX_PAGE = 1_000_000;

export function parseTargetPage(value: string, total: number): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const page = Number(trimmed);
  const maxPage = total > 0 ? Math.min(total, MAX_PAGE) : MAX_PAGE;
  if (!Number.isSafeInteger(page) || page < 0 || page > maxPage) return null;
  return page;
}

export function clampTargetPage(page: number, total: number): number {
  const maxPage = total > 0 ? Math.min(total, MAX_PAGE) : MAX_PAGE;
  return Math.min(maxPage, Math.max(0, Math.trunc(page)));
}

function targetErrorMessage(value: string, total: number): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "ページを入力してください。";
  if (parseTargetPage(trimmed, total) !== null) return null;
  if (!/^\d+$/.test(trimmed)) return "0以上の整数で入力してください。";
  const maxPage = total > 0 ? Math.min(total, MAX_PAGE) : MAX_PAGE;
  return `0〜${maxPage}ページの範囲で入力してください。`;
}

function percentOf(page: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((page / total) * 100)));
}

function formatDelta(delta: number) {
  if (delta === 0) return "変更なし";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(delta)}ページ`;
}

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

export function PageControls({
  bookId,
  current,
  total,
  onSet,
  onCancel,
}: {
  bookId: string;
  current: number;
  total: number;
  onUpdate?: (bookId: string, delta: number) => void;
  onSet: (bookId: string, page: number) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(String(current));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const lastCurrentRef = useRef(current);
  const pendingSaveRef = useRef<{ target: number; from: number } | null>(null);
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const setPreview = useProgressPreviewStore((state) => state.setPreview);
  const clearPreview = useProgressPreviewStore((state) => state.clearPreview);

  const target = parseTargetPage(draft, total);
  const error = targetErrorMessage(draft, total);
  const currentPercent = percentOf(current, total);
  const targetPercent = target === null ? null : percentOf(target, total);
  const delta = target === null ? null : target - current;
  const canSubmit = target !== null && target !== current && !isSaving;
  const canDecrease = (target ?? current) > 0;
  const canIncrease =
    (target ?? current) < (total > 0 ? Math.min(total, MAX_PAGE) : MAX_PAGE);

  useEffect(() => {
    if (current === lastCurrentRef.current) return;
    const previousCurrent = lastCurrentRef.current;
    lastCurrentRef.current = current;
    const pendingSave = pendingSaveRef.current;
    if (pendingSave !== null) {
      if (current === pendingSave.target) {
        setDraft(String(current));
        return;
      }
      if (current === pendingSave.from) {
        pendingSaveRef.current = null;
        return;
      }
      pendingSaveRef.current = null;
    }
    setDraft((value) => {
      if (
        value === String(previousCurrent) ||
        parseTargetPage(value, total) === current
      ) {
        return String(current);
      }
      return value;
    });
  }, [current, total]);

  useEffect(() => {
    if (target !== null && target !== current) {
      setPreview(bookId, target);
    } else {
      clearPreview();
    }
  }, [bookId, clearPreview, current, setPreview, target]);

  useEffect(() => () => clearPreview(), [clearPreview]);

  const adjust = (direction: -1 | 1) => {
    const base = target ?? clampTargetPage(current, total);
    pendingSaveRef.current = null;
    setDraft(String(clampTargetPage(base + direction, total)));
  };

  const submit = async () => {
    if (!canSubmit || target === null || savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    pendingSaveRef.current = { target, from: current };
    try {
      await onSet(bookId, target);
    } catch {
      pendingSaveRef.current = null;
      setSaveError("記録できませんでした。もう一度お試しください。");
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const cancel = () => {
    pendingSaveRef.current = null;
    setDraft(String(current));
    clearPreview();
    onCancel?.();
  };

  return (
    <div className={progressStyles.root}>
      <div className={progressStyles.currentRow}>
        <div>
          <span className={progressStyles.eyebrow}>現在の進捗</span>
          <div className={progressStyles.currentValue}>
            {current}
            <span className={progressStyles.currentTotal}>
              {" "}
              / {total > 0 ? `${total}ページ` : "ページ数未設定"}
            </span>
          </div>
        </div>
        <span className={progressStyles.currentPercent}>
          {currentPercent === null ? (
            <>
              <span aria-hidden="true">—</span>
              <span className={progressStyles.srOnly}>進捗率未設定</span>
            </>
          ) : (
            `${currentPercent}%`
          )}
        </span>
      </div>

      <div className={progressStyles.targetHeader}>
        <label className={progressStyles.eyebrow} htmlFor={inputId}>
          新しい現在ページ
        </label>
      </div>

      <div className={progressStyles.targetRow}>
        <button
          type="button"
          className={progressStyles.stepper}
          onClick={() => adjust(-1)}
          disabled={!canDecrease || isSaving}
          aria-label="1ページ戻す"
        >
          −
        </button>
        <input
          id={inputId}
          type="number"
          disabled={isSaving}
          inputMode="numeric"
          value={draft}
          min={0}
          max={total > 0 ? Math.min(total, MAX_PAGE) : MAX_PAGE}
          step={1}
          aria-label="記録するページ"
          aria-invalid={error !== null}
          aria-describedby={error !== null ? errorId : undefined}
          onChange={(event) => {
            pendingSaveRef.current = null;
            setDraft(event.target.value);
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submit();
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              adjust(1);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              adjust(-1);
            }
          }}
          className={progressStyles.input}
        />
        <button
          type="button"
          className={progressStyles.stepper}
          onClick={() => adjust(1)}
          disabled={!canIncrease || isSaving}
          aria-label="1ページ進める"
        >
          +
        </button>
        <span className={progressStyles.unit}>
          {total > 0 ? `/ ${total}p` : "ページ数未設定"}
        </span>
      </div>

      <div className={progressStyles.previewRow} aria-live="polite">
        <span className={progressStyles.delta}>
          {delta === null ? "—" : formatDelta(delta)}
        </span>
        <span>
          記録後{" "}
          <strong className={progressStyles.previewPercent}>
            {targetPercent === null ? "—" : `${targetPercent}%`}
          </strong>
        </span>
      </div>

      {error !== null && (
        <p id={errorId} className={progressStyles.error} role="alert">
          {error}
        </p>
      )}
      {saveError !== null && <p role="alert">{saveError}</p>}

      <div className={progressStyles.actions}>
        <button
          type="button"
          className={progressStyles.cancel}
          onClick={cancel}
          disabled={isSaving}
          aria-label="記録するページのプレビューを取り消す"
        >
          キャンセル
        </button>
        <button
          type="button"
          className={progressStyles.submit}
          onClick={() => void submit()}
          disabled={!canSubmit}
        >
          {isSaving ? "記録中..." : "このページまで記録"}
        </button>
      </div>
    </div>
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
  onUpdateBook: (
    bookId: string,
    updates: Partial<Book>,
  ) => Promise<boolean> | undefined;
  onPageUpdate: (bookId: string, delta: number) => void;
  onPageSet: (bookId: string, page: number) => Promise<void> | void;
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
  const activePanel = useBookListStore((state) => state.activePanel);
  const setPanel = useBookListStore((state) => state.setPanel);
  const closePanel = useBookListStore((state) => state.closePanel);
  const isDelOpen = activePanel === "delete";
  const isEditOpen = activePanel === "edit";
  const isRecording = activePanel === "progress";
  const setIsDelOpen = (open: boolean) =>
    open ? setPanel("delete") : closePanel("delete");
  const setIsEditOpen = (open: boolean) =>
    open ? setPanel("edit") : closePanel("edit");
  const setIsRecording = (open: boolean) =>
    open ? setPanel("progress") : closePanel("progress");
  useEffect(
    () => () => {
      closePanel("progress");
      closePanel("edit");
      closePanel("delete");
    },
    [closePanel],
  );

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [failedCover, setFailedCover] = useState<string | null>(null);

  useEffect(() => {
    if (!book || activePanel !== null) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [book, activePanel, onClose]);

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
          onSaveAction={onUpdateBook}
        />
      )}
      {isRecording && (
        <Modal
          isOpen
          onClose={() => setIsRecording(false)}
          variant="floating"
          placement="end"
          className={progressStyles.position}
        >
          <section
            className={progressStyles.dialog}
            role="dialog"
            aria-labelledby="reading-progress-title"
            data-star-tool="progress"
          >
            <header className={progressStyles.dialogHeader}>
              <h2 id="reading-progress-title">読書を記録</h2>
              <CloseButton
                onClick={() => setIsRecording(false)}
                aria-label="読書記録を閉じる"
              />
            </header>
            <div className={progressStyles.bookSummary}>
              <Image
                src={
                  book.coverUrl && book.coverUrl !== failedCover
                    ? book.coverUrl.replace("http://", "https://")
                    : "/images/book-cover-fallback.png"
                }
                alt={book.coverUrl ? `${book.title}の書影` : "書影なし"}
                width={100}
                height={140}
                unoptimized
                onError={() => setFailedCover(book.coverUrl)}
              />
              <div>
                <h3>{book.title}</h3>
                <p>{book.author || "著者未設定"}</p>
                <p>
                  現在　{book.currentPage} /{" "}
                  {book.totalPages > 0 ? book.totalPages : "未設定"} ページ ·{" "}
                  {percentOf(book.currentPage, book.totalPages) ?? "—"}%
                </p>
              </div>
            </div>
            <PageControls
              key={book.id}
              bookId={book.id}
              current={book.currentPage}
              total={book.totalPages}
              onSet={onPageSet}
              onCancel={() => setIsRecording(false)}
            />
          </section>
        </Modal>
      )}
      <section
        className={styles.panel}
        data-star-detail
        data-expanded={isNotesOpen}
        hidden={activePanel !== null}
        aria-labelledby="selected-book-title"
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <CloseButton onClick={onClose} aria-label="パネルを閉じる" />
        <div className={styles.bookHeader}>
          <Image
            src={
              book.coverUrl && book.coverUrl !== failedCover
                ? book.coverUrl.replace("http://", "https://")
                : "/images/book-cover-fallback.png"
            }
            alt={
              book.coverUrl && book.coverUrl !== failedCover
                ? `${book.title}の書影`
                : "書影なし"
            }
            width={92}
            height={126}
            className={styles.cover}
            unoptimized
            onError={() => setFailedCover(book.coverUrl)}
          />
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
          onClick={() => setIsRecording(!isRecording)}
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
          <summary className={styles.secondaryButton}>
            <span>読書の記録・書籍情報</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
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
