"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { Box, Center, Circle, Flex, styled as s } from "styled-system/jsx";
import BookListDrawer from "@/components/BookListDrawer";
import StarInsightPanel from "@/components/StarInsightPanel";
import AddBookModal from "@/components/sections/AddBookModal";
import BottomDock from "@/components/sections/BottomDock";
import StatsOverlay from "@/components/sections/StatsOverlay";
import TopBar from "@/components/sections/TopBar";
import { IconCardButton } from "@/components/shares/IconCardButton";
import TutorialOverlay from "@/components/TutorialOverlay";
import { useObservatory } from "@/hooks/useObservatory";
import { useStarInsight } from "@/hooks/useStarInsight";
import useLibraryStore from "@/store/useLibraryStore";

// 動的に UniverseCanvasを読み込む
const UniverseCanvas = dynamic(
  () => import("@/components/universe/UniverseCanvas"),
  {
    ssr: false,
    loading: () => (
      <Center position="fixed" inset={0} bg="#020617">
        <Flex flexDir="column" align="center" gap="4">
          <Circle size={6} bg="indigo.500" animation="ping" />
          <s.p fontSize="xs" color="slate.500" letterSpacing="widest">
            宇宙を展開中...
          </s.p>
        </Flex>
      </Center>
    ),
  },
);

function AddBookButton({
  setIsAddModalOpen,
  isBottomDockVisible,
}: {
  setIsAddModalOpen: (open: boolean) => void;
  isBottomDockVisible: boolean;
}) {
  return (
    <IconCardButton
      icon="plus"
      label="本を追加"
      onClick={() => setIsAddModalOpen(true)}
      className={css({
        color: "indigo.300",
        shadow: "xl indigo.500/10",
        _hover: { scale: "105%" },
        _active: { scale: "95%" },
        transitionProperty: "transform",
        transitionDuration: "200ms",
        transitionTimingFunction: "ease-in-out",
        "@media (min-width: 768px)": {
          bottom: 6,
          right: 6,
        },
        "@media (max-width: 767px)": {
          bottom: isBottomDockVisible ? 36 : -6,
          right: 4,
        },
        "@media (prefers-reduced-motion: reduce)": {
          transitionProperty: "none",
        },
        "@media (hover: hover)": {
          _hover: {
            scale: "105%",
          },
        },
      })}
      materialProps={{
        thickness: "thin",
        tint: "primary",
        tintOpacity: 0.15,
      }}
    />
  );
}

function VrModeButton({
  vrMode,
  onToggle,
  isBottomDockVisible,
}: {
  vrMode: boolean;
  onToggle: () => void;
  isBottomDockVisible: boolean;
}) {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(navigator.maxTouchPoints > 0 || "ontouchstart" in window);
  }, []);

  if (!isTouchDevice) return null;

  return (
    <IconCardButton
      icon={vrMode ? "rotate-ccw" : "rotate-3d"}
      label={vrMode ? "VRモードを終了" : "VRモード（ジャイロ）"}
      onClick={onToggle}
      className={css({
        color: vrMode ? "purple.300" : "indigo.300",
        shadow: vrMode ? "xl purple.500/20" : "xl indigo.500/10",
        _hover: { scale: "105%" },
        _active: { scale: "95%" },
        bottom: isBottomDockVisible ? 36 : -6,
        transitionProperty: "transform",
        transitionDuration: "200ms",
        transitionTimingFunction: "ease-in-out",
        "@media (prefers-reduced-motion: reduce)": {
          transitionProperty: "none",
        },
      })}
      materialProps={{
        thickness: "thin",
        tint: vrMode ? "secondary" : "primary",
        tintOpacity: vrMode ? 0.25 : 0.15,
      }}
    />
  );
}

export default function Observatory() {
  const books = useLibraryStore((s) => s.books);
  const constellationLines = useLibraryStore((s) => s.constellationLines);
  const fetchBooks = useLibraryStore((s) => s.fetchBooks);
  const newlyAddedBookId = useLibraryStore((s) => s.newlyAddedBookId);
  const clearNewlyAdded = useLibraryStore((s) => s.clearNewlyAdded);
  const isBottomDockVisible = useLibraryStore((s) => s.isBottomDockVisible);

  const [vrMode, setVrMode] = useState(false);

  // ログインユーザーの本をAPIから取得
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const {
    filteredBooks,
    bookCount,
    selectedBookId,
    isAddModalOpen,
    setIsAddModalOpen,
    handleStarClick,
    handleAdd,
  } = useObservatory();
  const starInsight = useStarInsight();

  const { updatePageProgress, setSelectedBook } = useLibraryStore();

  const nowReading = books.filter((b) => b.status === "reading");

  return (
    <s.main position="relative" w="screen" h="screen" overflow="hidden">
      <UniverseCanvas
        books={filteredBooks}
        constellationLines={constellationLines}
        onStarClick={handleStarClick}
        selectedBookId={selectedBookId}
        newlyAddedBookId={newlyAddedBookId}
        onBirthEffectComplete={clearNewlyAdded}
        vrMode={vrMode}
      />
      <TopBar bookCount={bookCount} />

      <Box
        position="fixed"
        bottom={16}
        right={4}
        md={{ bottom: 6, right: 6 }}
        zIndex={30}
      >
        <AddBookButton
          isBottomDockVisible={isBottomDockVisible}
          setIsAddModalOpen={setIsAddModalOpen}
        />
      </Box>

      {/* VRモード切り替えボタン（スマホのみ表示） */}
      <Box position="fixed" bottom={16} left={4} zIndex={30}>
        <VrModeButton
          vrMode={vrMode}
          onToggle={() => setVrMode((v) => !v)}
          isBottomDockVisible={isBottomDockVisible}
        />
      </Box>

      <BottomDock
        nowReading={nowReading}
        onQuickAdd={(bookId) => updatePageProgress(bookId, 1)}
        onBookClick={(book) => setSelectedBook(book)}
      />

      <AddBookModal
        isOpen={isAddModalOpen}
        onCloseAction={() => setIsAddModalOpen(false)}
        onAddAction={handleAdd}
      />

      <BookListDrawer />

      <StarInsightPanel {...starInsight} />

      <StatsOverlay books={books} />

      <TutorialOverlay />
    </s.main>
  );
}
