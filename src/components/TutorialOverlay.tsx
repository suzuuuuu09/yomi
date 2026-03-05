"use client";

import {
  BarChart3,
  BookPlus,
  ChevronRight,
  List,
  Sparkles,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { css } from "styled-system/css";
import { Box, Flex, styled as s } from "styled-system/jsx";
import Card from "~liftkit/card";
import Column from "~liftkit/column";
import Text from "~liftkit/text";

const STORAGE_KEY = "yomi-tutorial-completed";

const STEPS = [
  {
    icon: <Sparkles size={24} />,
    title: "YOMi へようこそ！",
    description:
      "YOMi は読書管理アプリです。あなたの本が宇宙の星となり、読書の旅を美しく可視化します。",
  },
  {
    icon: <BookPlus size={24} />,
    title: "星を追加する",
    description:
      "右下の「+」ボタンから本を追加できます。キーワード検索、ISBN検索、手動入力の3つの方法から選べます。",
  },
  {
    icon: <Star size={24} />,
    title: "星をタップする",
    description:
      "宇宙に浮かぶ星をクリックすると、その本の詳細を確認できます。読書の進捗を更新したり、メモを残すこともできます。",
  },
  {
    icon: <List size={24} />,
    title: "本を一覧で管理",
    description:
      "左上のメニューから本の一覧を開けます。フィルタータブで「読書中」「未読」「読了」を切り替えられます。",
  },
  {
    icon: <BarChart3 size={24} />,
    title: "星座を作ろう",
    description:
      "同じジャンルの本を読了すると、星同士が星座線で結ばれます。たくさん読んで、あなただけの星座を作りましょう！",
  },
] as const;

export default function TutorialOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      setIsVisible(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={2000}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={{ base: "4", md: "8" }}
      animation="fadeIn 0.3s ease-out"
      style={{
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <Box
        w="full"
        maxW="sm"
        animation="scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
      >
        <Card
          material="glass"
          variant="outline"
          scaleFactor="body"
          className={css({ boxShadow: "2xl" })}
        >
          <Column gap="lg">
            {/* アイコン */}
            <Flex justify="center">
              <Box
                w="56px"
                h="56px"
                rounded="2xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                className={css({
                  bg: "indigo.500/15",
                  border: "2px solid",
                  borderColor: "indigo.500/20",
                  color: "indigo.400",
                })}
              >
                {current.icon}
              </Box>
            </Flex>

            {/* コンテンツ */}
            <Box textAlign="center">
              <s.h2 fontSize="lg" fontWeight="bold" color="white" mb={2}>
                {current.title}
              </s.h2>
              <Text
                tag="p"
                fontClass="caption"
                className={css({ color: "slate.400", lineHeight: "relaxed" })}
              >
                {current.description}
              </Text>
            </Box>

            {/* 進捗ドット */}
            <Flex justify="center" gap={2}>
              {STEPS.map((_, i) => (
                <Box
                  key={`dot-${STEPS[i].title}`}
                  w={step === i ? "20px" : "6px"}
                  h="6px"
                  rounded="full"
                  transition="all"
                  transitionDuration="300ms"
                  className={css({
                    bg: step === i ? "indigo.400" : "white/15",
                  })}
                />
              ))}
            </Flex>

            {/* ボタン */}
            <Flex gap={3}>
              {!isLast && (
                <s.button
                  type="button"
                  onClick={handleSkip}
                  flex={1}
                  py={3}
                  rounded="xl"
                  fontSize="sm"
                  cursor="pointer"
                  className={css({
                    bg: "white/5",
                    color: "slate.400",
                    transition: "all 0.2s",
                    _hover: { bg: "white/10", color: "white" },
                  })}
                >
                  スキップ
                </s.button>
              )}
              <s.button
                type="button"
                onClick={handleNext}
                flex={1}
                py={3}
                rounded="xl"
                fontSize="sm"
                fontWeight="semibold"
                cursor="pointer"
                display="flex"
                alignItems="center"
                justifyContent="center"
                gap={1}
                className={css({
                  bg: "indigo.500/20",
                  border: "1px solid",
                  borderColor: "indigo.500/30",
                  color: "indigo.300",
                  transition: "all 0.2s",
                  _hover: { bg: "indigo.500/30" },
                })}
              >
                {isLast ? "はじめる" : "次へ"}
                {!isLast && <ChevronRight size={16} />}
              </s.button>
            </Flex>
          </Column>
        </Card>
      </Box>
    </Box>
  );
}
