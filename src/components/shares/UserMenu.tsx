"use client";

import {
  Globe2,
  LogIn,
  LogOut,
  Settings,
  User as UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { css, sva } from "styled-system/css";
import { Box, HStack, styled as s } from "styled-system/jsx";
import { authClient } from "@/lib/auth-client";
import useLibraryStore from "@/store/useLibraryStore";
import Card from "~liftkit/card";
import Text from "~liftkit/text";

const userMenuStyles = sva({
  slots: ["card", "avatar", "text", "logoutButton", "loginButton", "loginIcon"],
  base: {
    card: {
      shadow: "lg",
      shadowColor: "black/20",
      transition: "all 150ms",
    },
    avatar: {
      rounded: "full",
    },
    text: {
      color: "slate.300",
      maxW: "80px",
      truncate: true,
      _hidden: { display: "none" },
      md: { display: "inline" },
    },
    loginButton: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      gap: "3",
      px: "3",
      py: "2",
      rounded: "xl",
      fontSize: "sm",
      fontWeight: "medium",
      color: "slate.400",
      border: "1px solid",
      borderColor: "white/12",
      bg: "white/6",
      cursor: "pointer",
      transitionProperty: "all",
      transitionDuration: "150ms",
      _hover: {
        color: "indigo.300",
        borderColor: "white/20",
        bg: "white/10",
      },
      _active: { bg: "white/14" },
      shadow: "md",
    },
    loginIcon: { color: "slate.400" },
  },
  variants: {
    status: {
      idle: {
        card: { color: "slate.400" },
      },
      login: {
        card: {
          color: "slate.400",
          _hover: { color: "indigo.400" },
        },
      },
      logout: {
        card: {
          color: "slate.400",
          _hover: { color: "red.400" },
        },
      },
    },
  },
});

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
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

  if (isPending) {
    const styles = userMenuStyles({ status: "idle" });
    return (
      <Card
        material="glass"
        variant="outline"
        scaleFactor="caption"
        materialProps={{ thickness: "thin" }}
        className={styles.card}
      >
        <Box w="5" h="5" rounded="full" bg="slate.600" />
      </Card>
    );
  }

  if (session?.user) {
    const loginStyles = userMenuStyles({ status: "login" });
    const logoutStyles = userMenuStyles({ status: "logout" });

    return (
      <>
        <HStack gap={1.5}>
          <Card
            material="glass"
            variant="outline"
            scaleFactor="caption"
            materialProps={{ thickness: "thin" }}
            className={loginStyles.card}
          >
            <HStack gap="2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={20}
                  height={20}
                  className={loginStyles.avatar}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon size={15} className="text-indigo-400" />
              )}
              <Text tag="span" fontClass="capline" className={loginStyles.text}>
                {session.user.name}
              </Text>
            </HStack>
          </Card>
          <Card
            material="glass"
            variant="outline"
            scaleFactor="caption"
            materialProps={{ thickness: "thin" }}
            isClickable
            onClick={handleLogout}
            className={logoutStyles.card}
            aria-label="ログアウト"
          >
            <LogOut size={15} />
          </Card>
          <Card
            material="glass"
            variant="outline"
            scaleFactor="caption"
            materialProps={{ thickness: "thin" }}
            isClickable
            onClick={openSettings}
            className={loginStyles.card}
          >
            <Settings size={15} aria-label="読書設定" />
          </Card>
        </HStack>
        {settingsOpen && (
          <Box
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
                    読書設定
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

              <Box>
                <HStack justify="between" mb={2}>
                  <Text tag="h3" fontClass="caption-bold" color="outline">
                    アーカイブ済み
                  </Text>
                  <Text tag="span" fontClass="capline" color="outline">
                    {archivedBooks.length}冊
                  </Text>
                </HStack>
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
              </Box>
            </Box>
          </Box>
        )}
      </>
    );
  }

  const unauthStyles = userMenuStyles({ status: "idle" });
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
      className={unauthStyles.loginButton}
    >
      <LogIn size={15} className={unauthStyles.loginIcon} />
      <Text tag="span" fontClass="capline" className="hidden md:inline">
        ログイン
      </Text>
    </Box>
  );
}
