"use client";

import { Globe2, LogIn, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { css } from "styled-system/css";
import { Box, HStack, styled as s } from "styled-system/jsx";
import GuestDataControls from "@/components/GuestDataControls";
import styles from "@/components/observatory.module.css";
import spatialStyles from "@/components/shares/user-menu-spatial.module.css";
import { authClient } from "@/lib/auth-client";
import { isGuestMode } from "@/lib/library-mode";
import useLibraryStore from "@/store/useLibraryStore";
import Text from "~liftkit/text";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const guest = isGuestMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timezoneDraft, setTimezoneDraft] = useState("");
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
      if (event.key === "Escape") {
        setSettingsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef.current?.contains(target)
      ) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [settingsOpen]);

  const openSettings = () => {
    setTimezoneDraft(readingTimezone ?? "");
    setTimezoneError(null);
    setSettingsOpen(true);
    void fetchArchivedBooks();
  };

  const saveTimezone = async () => {
    try {
      new Intl.DateTimeFormat(undefined, { timeZone: timezoneDraft }).format();
    } catch {
      setTimezoneError("IANAタイムゾーンを入力してください（例: Asia/Tokyo）");
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
              onClick={() => setSettingsOpen(false)}
            >
              <Box
                ref={panelRef}
                className={spatialStyles.panel}
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
                <HStack justify="between" mb={5}>
                  <HStack gap={2}>
                    <Globe2 size={15} color="#a5b4fc" />
                    <Text tag="h2" fontClass="callout-bold" color="onsurface">
                      設定
                    </Text>
                  </HStack>
                  <s.button
                    type="button"
                    onClick={() => setSettingsOpen(false)}
                    color="slate.500"
                    fontSize="xs"
                  >
                    閉じる
                  </s.button>
                </HStack>

                <HStack justify="between" mb={5}>
                  <Text tag="span" fontClass="caption" color="onsurface">
                    {guest
                      ? "ゲスト · このブラウザーに保存"
                      : session?.user.name}
                  </Text>
                  {!guest && (
                    <button
                      type="button"
                      className={styles.glassButton}
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      ログアウト
                    </button>
                  )}
                </HStack>

                <GuestDataControls guest={guest} userId={session?.user.id} />

                <Box mb={6}>
                  <Text tag="label" fontClass="caption" color="outline">
                    読書タイムゾーン
                  </Text>
                  <Text tag="p" fontClass="capline" color="outline">
                    読書日の境界に使うIANAタイムゾーンです。
                  </Text>
                  <s.input
                    value={timezoneDraft}
                    onChange={(event) => setTimezoneDraft(event.target.value)}
                    placeholder="Asia/Tokyo"
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
                  />
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
                    タイムゾーンを保存
                  </s.button>
                </Box>

                <details className={spatialStyles.archive}>
                  <summary>
                    <Text tag="h3" fontClass="caption-bold" color="outline">
                      アーカイブ済み
                    </Text>
                    <Text tag="span" fontClass="capline" color="outline">
                      {archivedBooks.length}冊
                    </Text>
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
