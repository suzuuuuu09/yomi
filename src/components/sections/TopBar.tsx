"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { Box, Flex, styled as s } from "styled-system/jsx";
import type { FilterTabsCounts } from "@/components/shares/FilterTabs";
import FilterTabs from "@/components/shares/FilterTabs";
import { IconCardButton } from "@/components/shares/IconCardButton";
import UserMenu from "@/components/shares/UserMenu";
import useBookListStore from "@/store/useBookListStore";
import useLibraryFilterStore from "@/store/useLibraryFilterStore";
import Card from "~liftkit/card";
import Column from "~liftkit/column";
import Row from "~liftkit/row";
import Text from "~liftkit/text";
import TextInput from "~liftkit/text-input";

export default function TopBar({ bookCount }: { bookCount: FilterTabsCounts }) {
  const { activeFilter, query, setFilter, setQuery, clearSearch } =
    useLibraryFilterStore();
  const openBookList = useBookListStore((s) => s.open);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <s.header
      position="fixed"
      top={{ base: "3", md: "4" }}
      left={{ base: "3", md: "4" }}
      right={{ base: "3", md: "4" }}
      zIndex="30"
      spaceY="2"
    >
      <Column gap="xs">
        <Row gap="xs">
          <Card
            material="glass"
            variant="outline"
            scaleFactor="caption"
            materialProps={{ thickness: "thin" }}
            className="shrink-0 shadow-lg shadow-black/20"
          >
            <Text
              tag="span"
              fontClass="callout-bold"
              className="tracking-widest"
              style={{
                background: "linear-gradient(135deg,#818cf8,#a855f7,#ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              YOMi
            </Text>
          </Card>

          {/* PC: 常に表示 / Mobile: isSearchOpen時のみ */}
          <Box
            flex={1}
            display={{ base: isSearchOpen ? "block" : "none", md: "block" }}
          >
            <TextInput
              name=""
              placeholder="星を検索..."
              endIcon={query ? "x" : "search"}
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              onEndIconClick={query ? clearSearch : undefined}
            />
          </Box>

          <Flex shrink={0} gap="1.5" align="center">
            {/* Mobile: 検索トグルボタン */}
            <Box display={{ base: "block", md: "none" }}>
              <IconCardButton
                icon={isSearchOpen ? "x" : "search"}
                label="検索"
                onClick={() => {
                  setIsSearchOpen((prev) => !prev);
                  if (isSearchOpen && query) clearSearch();
                }}
                className={css({
                  shadow: "lg",
                  color: isSearchOpen ? "indigo.300" : "slate.400",
                  shadowColor: "black/20",
                })}
              />
            </Box>
            <IconCardButton
              icon="library"
              label="本の一覧"
              onClick={openBookList}
              className={css({
                shadow: "lg",
                color: "slate.400",
                shadowColor: "black/20",
                "@media (hover: hover)": {
                  _hover: {
                    color: "white",
                  },
                },
              })}
            />
            <UserMenu />
          </Flex>
        </Row>

        <FilterTabs
          activeFilter={activeFilter}
          setFilter={setFilter}
          counts={bookCount}
        />
      </Column>
    </s.header>
  );
}
