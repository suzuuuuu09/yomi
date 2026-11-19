"use client";

import {
  BookOpen,
  ChevronRight,
  LogIn,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { css } from "styled-system/css";
import { Box, HStack, styled as s } from "styled-system/jsx";
import GuestDataControls from "@/components/GuestDataControls";
import styles from "@/components/observatory.module.css";
import CloseButton from "@/components/shares/CloseButton";
import spatialStyles from "@/components/shares/user-menu-spatial.module.css";
import { authClient } from "@/lib/auth-client";
import { isGuestMode } from "@/lib/library-mode";
import useBookListStore from "@/store/useBookListStore";
import useLibraryStore from "@/store/useLibraryStore";
import Text from "~liftkit/text";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const guest = isGuestMode();
  const settingsOpen = useBookListStore(
    (state) => state.activePanel === "settings",
  );
  const setSettingsOpen = useCallback((open: boolean) => {
    const ui = useBookListStore.getState();
    if (open) ui.setPanel("settings");
    else ui.closePanel("settings");
  }, []);
  const [timezoneDraft, setTimezoneDraft] = useState("");
  const [timezones, setTimezones] = useState<string[]>([]);
  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const readingTimezone = useLibraryStore((state) => state.readingTimezone);
  const archivedBooks = useLibraryStore((state) => state.archivedBooks);
  const fetchArchivedBooks = useLibraryStore(
    (state) => state.fetchArchivedBooks,
  );
  const setReadingTimezone = useLibraryStore(
    (state) => state.setReadingTimezone,
  );
  const restoreBook = useLibraryStore((state) => state.restoreBook);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        setSettingsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen, setSettingsOpen]);

  const openSettings = () => {
    const currentTimezone =
      readingTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezones(
      [
        ...new Set([
          "UTC",
          currentTimezone,
          ...Intl.supportedValuesOf("timeZone"),
        ]),
      ].sort(),
    );
    setTimezoneDraft(currentTimezone);
    setTimezoneError(null);
    setSettingsOpen(true);
    void fetchArchivedBooks();
  };

  const saveTimezone = async () => {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezoneDraft }).format();
    } catch {
      setTimezoneError("有効なタイムゾーンを選択してください");
      return;
    }
    if (await setReadingTimezone(timezoneDraft)) setSettingsOpen(false);
  };

  const handleLogout = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.reload();
        },
      },
    });
  };

  if (isPending && !guest) {
    return (
      <button
        type="button"
        disabled
        className={styles.glassButton}
        aria-label="設定を読み込み中"
      >
        <Settings size={18} />
        <span>設定</span>
      </button>
    );
  }

  if (session?.user || guest) {
    return (
      <>
        <button
          ref={triggerRef}
          type="button"
          className={styles.glassButton}
          onClick={openSettings}
          aria-expanded={settingsOpen}
        >
          <Settings size={18} aria-hidden="true" />
          <span>{guest ? "ゲスト · 設定" : "設定"}</span>
        </button>
        {settingsOpen &&
          createPortal(
            <Box
              className={spatialStyles.overlay}
              position="fixed"
              inset={0}
              zIndex={100}
              display="flex"
              alignItems="flex-start"
              justifyContent="flex-end"
              p={{ base: 3, md: 5 }}
              bg="black/45"
            >
              <Box
                ref={panelRef}
                className={spatialStyles.panel}
                data-settings-panel
                w={{ base: "full", md: "360px" }}
                maxH="calc(100vh - 2rem)"
                overflowY="auto"
                p={5}
                rounded="3xl"
                border="1px solid"
                borderColor="indigo.400/20"
                bg="gray.950/95"
                shadow="2xl"
                shadowColor="black/50"
                onClick={(event) => event.stopPropagation()}
              >
                <header className={spatialStyles.header}>
                  <Text tag="h2" fontClass="callout-bold" color="onsurface">
                    設定
                  </Text>
                  <CloseButton
                    onClick={() => setSettingsOpen(false)}
                    aria-label="設定を閉じる"
                  />
                </header>

                <HStack className={spatialStyles.profile} mb={5}>
                  {!guest && session?.user.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={56}
                      height={56}
                      unoptimized
                      className={spatialStyles.avatar}
                    />
                  ) : (
                    <span className={spatialStyles.avatar}>
                      <UserRound size={26} aria-hidden="true" />
                    </span>
                  )}
                  <Text tag="span" fontClass="caption" color="onsurface">
                    {guest
                      ? "ゲスト · このブラウザーに保存"
                      : session?.user.name}
                  </Text>
                </HStack>

                <GuestDataControls guest={guest} userId={session?.user.id} />

                <Box mb={6} className={spatialStyles.readingSettings}>
                  <h3>読書の設定</h3>
                  <s.label htmlFor="reading-timezone">
                    <Text tag="span" fontClass="caption" color="outline">
                      タイムゾーン
                    </Text>
                  </s.label>
                  <Text tag="p" fontClass="capline" color="outline">
                    読書日の区切りに使います
                  </Text>
                  <s.select
                    id="reading-timezone"
                    value={timezoneDraft}
                    onChange={(event) => setTimezoneDraft(event.target.value)}
                    mt={2}
                    w="full"
                    px={3}
                    py={2.5}
                    rounded="xl"
                    bg="white/6"
                    border="1px solid"
                    borderColor="white/10"
                    color="slate.100"
                    fontSize="sm"
                    _focus={{ borderColor: "indigo.400/60", outline: "none" }}
                  >
                    {timezones.map((timezone) => (
                      <option key={timezone} value={timezone}>
                        {timezone}
                      </option>
                    ))}
                  </s.select>
                  {timezoneError && (
                    <Text
                      tag="p"
                      fontClass="capline"
                      color="outline"
                      className={css({ color: "red.300" })}
                    >
                      {timezoneError}
                    </Text>
                  )}
                  <s.button
                    className={spatialStyles.save}
                    type="button"
                    mt={3}
                    w="full"
                    py={2.5}
                    rounded="xl"
                    bg="indigo.500/20"
                    border="1px solid"
                    borderColor="indigo.400/30"
                    color="indigo.200"
                    fontSize="xs"
                    fontWeight="semibold"
                    onClick={() => void saveTimezone()}
                  >
                    保存
                  </s.button>
                </Box>

                <details className={spatialStyles.archive}>
                  <summary>
                    <BookOpen size={20} aria-hidden="true" />
                    <Text tag="h3" fontClass="caption-bold" color="outline">
                      アーカイブした本
                    </Text>
                    <Text tag="span" fontClass="capline" color="outline">
                      {archivedBooks.length}冊
                    </Text>
                    <ChevronRight
                      size={16}
                      className={spatialStyles.archiveChevron}
                      aria-hidden="true"
                    />
                  </summary>
                  {archivedBooks.length === 0 ? (
                    <Text tag="p" fontClass="capline" color="outline">
                      アーカイブされた本はありません。
                    </Text>
                  ) : (
                    <Box display="grid" gap={2}>
                      {archivedBooks.map((book) => (
                        <HStack
                          key={book.id}
                          justify="between"
                          gap={2}
                          p={2.5}
                          rounded="xl"
                          bg="white/4"
                        >
                          <Text
                            tag="span"
                            fontClass="caption"
                            color="outline"
                            className={css({ truncate: true })}
                          >
                            {book.title}
                          </Text>
                          <s.button
                            type="button"
                            onClick={() => void restoreBook(book.id)}
                            color="indigo.300"
                            fontSize="10px"
                            flexShrink={0}
                          >
                            復元
                          </s.button>
                        </HStack>
                      ))}
                    </Box>
                  )}
                </details>
                {!guest && (
                  <button
                    type="button"
                    className={spatialStyles.logout}
                    onClick={handleLogout}
                  >
                    <LogOut size={20} aria-hidden="true" />
                    ログアウト
                  </button>
                )}
              </Box>
            </Box>,
            document.body,
          )}
      </>
    );
  }

  const handleLogin = async () => {
    // Better Auth側でHttpOnlyのセッションCookieを失効させてからログイン画面へ進む。
    await authClient.signOut().catch(() => undefined);
    window.location.href = "/login";
  };

  return (
    <Box
      as="button"
      onClick={handleLogin}
      aria-label="Googleでログイン"
      className={styles.glassButton}
    >
      <LogIn size={15} />
      <Text tag="span" fontClass="capline" className="hidden md:inline">
        ログイン
      </Text>
    </Box>
  );
}
