"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Center, Circle, Flex, styled as s } from "styled-system/jsx";
import { authClient } from "@/lib/auth-client";
import { exportGuestBackup } from "@/lib/guest-library";
import { isGuestMode } from "@/lib/library-mode";
import useLibraryStore from "@/store/useLibraryStore";

export default function SessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [guest, setGuest] = useState<boolean | null>(null);
  const [guestAvailable, setGuestAvailable] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(true);

  useEffect(() => {
    try {
      setGuest(isGuestMode());
    } catch {
      setGuest(false);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === "yomi:library-mode" || event.key === null) {
        window.location.reload();
        return;
      }
      if (event.key !== "yomi:guest-library:v1" || !isGuestMode()) return;
      const store = useLibraryStore.getState();
      void store.fetchBooks();
      void store.fetchArchivedBooks();
      for (const id of Object.keys(store.readingLogsByBookId))
        void store.fetchReadingLogs(id);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (guest !== false || !session?.user) return;
    void exportGuestBackup()
      .then((text) => setGuestAvailable(JSON.parse(text).books.length > 0))
      .catch(() => undefined);
  }, [guest, session?.user]);

  useEffect(() => {
    if (guest !== false || isPending || session?.user) return;

    void authClient.signOut();
    router.replace("/login");
  }, [guest, isPending, router, session?.user]);

  if (guest === null || (!guest && (isPending || !session?.user))) {
    return (
      <Center position="fixed" inset={0} bg="#020617">
        <Flex flexDir="column" align="center" gap="4">
          <Circle size={6} bg="indigo.500" animation="ping" />
          <s.p fontSize="xs" color="slate.500" letterSpacing="widest">
            セッションを確認中...
          </s.p>
        </Flex>
      </Center>
    );
  }

  return (
    <>
      {children}
      {!guest && guestAvailable && noticeVisible && (
        <aside
          aria-label="ゲストの記録の引き継ぎ"
          style={{
            position: "fixed",
            bottom: "1rem",
            left: "1rem",
            right: "1rem",
            marginInline: "auto",
            maxWidth: "28rem",
            padding: "1rem",
            borderRadius: "1rem",
            background: "#0f172a",
            color: "#e2e8f0",
            zIndex: 90,
          }}
        >
          <p>
            このブラウザーにゲストの記録があります。設定の「ゲストの記録を引き継ぐ」から、アカウントへ追加できます。
          </p>
          <button type="button" onClick={() => setNoticeVisible(false)}>
            あとで
          </button>
        </aside>
      )}
    </>
  );
}
