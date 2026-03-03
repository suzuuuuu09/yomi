"use client";

import dynamic from "next/dynamic";
import { css } from "styled-system/css";
import { Circle, Flex, styled as s } from "styled-system/jsx";
import AddBookModal from "@/components/AddBookModal";
import BookListDrawer from "@/components/BookListDrawer";
import StarInsightPanel from "@/components/StarInsightPanel";
import BottomDock from "@/components/sections/BottomDock";
import StatsOverlay from "@/components/sections/StatsOverlay";
import TopBar from "@/components/sections/TopBar";
import { IconCardButton } from "@/components/shares/IconCardButton";
import { useObservatory } from "@/hooks/useObservatory";
import { useStarInsight } from "@/hooks/useStarInsight";
import useLibraryStore, { CONSTELLATION_LINES } from "@/store/useLibraryStore";

const UniverseCanvas = dynamic(() => import("@/components/UniverseCanvas"), {
  ssr: false,
  loading: () => (
    <s.div
      position="fixed"
      inset={0}
      bg="#020617"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <Flex flexDir="column" align="center" gap="4">
        <Circle size={6} bg="indigo.500" animation="ping" />
        <s.p
          fontSize="xs"
          color="slate.500"
          letterSpacing="widest"
          textTransform="uppercase"
        >
          宇宙を展開中...
        </s.p>
      </Flex>
    </s.div>
  ),
});

function AddBookButton({
  setIsAddModalOpen,
}: {
  setIsAddModalOpen: (open: boolean) => void;
}) {
  return (
    <IconCardButton
      icon="plus"
      label="本を追加"
      onClick={() => setIsAddModalOpen(true)}
      className={css({
        color: "indigo.300",
        shadow: "xl indigo.500/10",
        _hover: {
          scale: "105%",
        },
        _active: {
          scale: "95%",
        },
        transitionProperty: "transform",
        transitionDuration: "200ms",
        transitionTimingFunction: "ease-in-out",
        "@media (min-width: 768px)": {
          bottom: 6,
          right: 6,
        },
        "@media (max-width: 767px)": {
          bottom: 36,
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

export default function Observatory() {
  const books = useLibraryStore((s) => s.books);
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
        constellationLines={CONSTELLATION_LINES}
        onStarClick={handleStarClick}
        selectedBookId={selectedBookId}
      />
      <TopBar bookCount={bookCount} />

      <s.div
        position="fixed"
        bottom={16}
        right={4}
        md={{ bottom: 6, right: 6 }}
        zIndex={30}
      >
        <AddBookButton setIsAddModalOpen={setIsAddModalOpen} />
      </s.div>

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
    </s.main>
  );
}
