"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { css } from "styled-system/css";
import { styled as s } from "styled-system/jsx";
import Card from "~liftkit/card";
import IconButton from "~liftkit/icon-button";
import AddBookModal from "@/components/AddBookModal";

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleClose = () => setIsAddModalOpen(false);
  const handleAdd = () => setIsAddModalOpen(false);

  return (
    <s.main position="relative" w="screen" h="screen" overflow="hidden">
      <s.div
        position="fixed"
        bottom={36}
        right={4}
        md={{ bottom: 6, right: 6 }}
        zIndex={30}
      >
        {/*
        <IconButton
          aria-label="本を追加"
          key="plus"
          icon="plus"
          size="xl"
          variant="fill"
        />
				*/}

        <Card
          material="glass"
          variant="outline"
          scaleFactor="label"
          isClickable
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
          aria-label="本を追加"
        >
          <Plus size={22} />
        </Card>
      </s.div>

      <AddBookModal
        isOpen={isAddModalOpen}
        onCloseAction={handleClose}
        onAddAction={handleAdd}
      />
    </s.main>
  );
}
