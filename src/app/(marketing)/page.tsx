import Link from "next/link";
import { css } from "styled-system/css";
import { Box, Center, Flex, Stack, styled as s } from "styled-system/jsx";
import StarfieldBackground from "@/components/shares/StarfieldBackground";
import Text from "~liftkit/text";
import Heading from "~liftkit/heading";
import Card from "~liftkit/card";
import type { IconName } from "lucide-react/dynamic";
import Badge from "~liftkit/badge";
import Grid from "~liftkit/grid";
import { token } from "styled-system/tokens";

type FeatureColor = "yellow.400" | "cyan.400" | "indigo.400";

interface FeatureItemProps {
  icon: IconName;
  title: string;
  description: string;
  color?: FeatureColor;
}

const features: FeatureItemProps[] = [
  {
    icon: "star",
    title: "本が星になる",
    description:
      "本を1冊登録すると、あなただけの宇宙に新しい「星」が生まれます。積読本は淡く輝く未観測の星として配置され、読み進めるほど星の輝きが増していきます。",
    color: "yellow.400",
  },
  {
    icon: "telescope",
    title: "3Dの宇宙を旅する",
    description:
      "あなたの読書記録が3Dの宇宙空間として広がります。星を眺めたり、ジャンルごとに星座を作ったり、宇宙旅行のように自由に探索できます。",
    color: "cyan.400",
  },
  {
    icon: "stars",
    title: "星座が生まれる",
    description:
      "読み終えた本は同じジャンルの読了本と線で結ばれ、オリジナルの星座が形成されます。あなたの学びの軌跡が美しい星座となって輝きます。",
    color: "indigo.400",
  },
];

// フィーチャーカード（マーケティング用シンプル版）
function FeatureItem(props: FeatureItemProps) {
  const { icon, title, description, color = "indigo.500" } = props;

  return (
    <Card
      material="glass"
      variant="outline"
      scaleFactor="body"
      className={css({ boxShadow: "2xl" })}
      style={
        { "--feature-color": token(`colors.${color}`) } as React.CSSProperties
      }
    >
      <Box p={1}>
        <Badge
          icon={icon}
          scale="lg"
          className={css({
            bg: "color-mix(in srgb, var(--feature-color) 15%, transparent)!",
            border: "2px solid!",
            borderColor:
              "color-mix(in srgb, var(--feature-color) 20%, transparent)!",
            color: "var(--feature-color)!",
            mb: "4",
          })}
          style={{}}
        />
        <Box>
          <Heading
            tag="h2"
            fontClass="title3-bold"
            className={css({
              color: "white",
              mb: "2!",
            })}
          >
            {title}
          </Heading>
          <Text
            tag="p"
            fontClass="body"
            className={css({ color: "slate.400" })}
          >
            {description}
          </Text>
        </Box>
      </Box>
    </Card>
  );
}

export default function MarketingPage() {
  return (
    <s.main
      position="relative"
      minH="screen"
      bg="#020617"
      overflow="hidden"
      color="white"
    >
      <StarfieldBackground />

      {/* ============ HERO ============ */}
      <Center
        position="relative"
        zIndex="10"
        minH="screen"
        flexDir="column"
        px="6"
        py="24"
      >
        <Stack gap="6" alignItems="center" maxW="2xl" textAlign="center">
          {/* ロゴ */}
          <Text
            tag="h1"
            fontClass="display1-bold"
            className={css({ letterSpacing: "0.25em" })}
            style={{
              background:
                "linear-gradient(135deg, #818cf8 0%, #a855f7 50%, #ec4899 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "clamp(3rem, 10vw, 5.5rem)",
            }}
          >
            YOMi
          </Text>

          {/* キャッチコピー */}
          <Text
            tag="h2"
            fontClass="title3-bold"
            className={css({
              color: "white",
              lineHeight: "1.4",
              fontSize: "clamp(1.1rem, 3vw, 1.6rem)",
            })}
          >
            読んだ本が、星になる。
            <br />
            あなただけの宇宙を育てよう。
          </Text>

          <Text
            tag="p"
            fontClass="callout"
            className={css({
              color: "slate.400",
              maxW: "lg",
              lineHeight: "1.8",
            })}
          >
            YOMiは読書記録を3D宇宙として可視化するアプリです。
            本を登録するたびに星が生まれ、同ジャンルの読了本が星座として結ばれていきます。
          </Text>

          {/* CTA ボタン群 */}
          <Flex gap="3" flexWrap="wrap" justifyContent="center" mt="2">
            <s.a
              href="/app"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              gap="2"
              px="8"
              py="3.5"
              borderRadius="full"
              fontSize="sm"
              fontWeight="600"
              color="white"
              cursor="pointer"
              transitionProperty="all"
              transitionDuration="200ms"
              _hover={{ scale: "1.04", opacity: "0.92" }}
              _active={{ scale: "0.97" }}
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
                boxShadow: "0 0 32px rgba(99,102,241,0.4)",
              }}
            >
              ✦ 宇宙を開く
            </s.a>
          </Flex>
        </Stack>
      </Center>

      {/* ============ FEATURES ============ */}
      <Box position="relative" zIndex="10" maxW="6xl" mx="auto" px="6" pb="24">
        {/* セクションタイトル */}
        <Stack gap="2" alignItems="center" textAlign="center" mb="12">
          <Text
            tag="h2"
            fontClass="title2-bold"
            className={css({ color: "white" })}
          >
            読書体験を宇宙へ
          </Text>
          <Text
            tag="p"
            fontClass="body"
            className={css({ color: "slate.500" })}
          >
            本を記録するだけで、あなたの知識の宇宙が広がっていく
          </Text>
        </Stack>

        {/* 
        <Flex gap="4" flexWrap="wrap" justifyContent="center">
          {features.map((f) => (
            <FeatureItem
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
            />
          ))}
        </Flex>
				*/}
        <Grid gap="md" columns={3}>
          {features.map((f) => (
            <FeatureItem
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
              color={f.color}
            />
          ))}
        </Grid>
      </Box>

      {/* ============ BOTTOM CTA ============ */}
      <Center
        position="relative"
        zIndex="10"
        flexDir="column"
        gap="6"
        pb="24"
        px="6"
        textAlign="center"
      >
        {/* 分割線グロー */}
        <Box
          w="full"
          maxW="xs"
          h="1px"
          mb="8"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(129,140,248,0.4), transparent)",
          }}
        />

        <Text
          tag="p"
          fontClass="title3-bold"
          className={css({ color: "white" })}
        >
          さあ、あなたの読書宇宙を育てよう
        </Text>

        <s.a
          href="/app"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          gap="2"
          px="10"
          py="4"
          borderRadius="full"
          fontSize="sm"
          fontWeight="600"
          color="white"
          cursor="pointer"
          transitionProperty="all"
          transitionDuration="200ms"
          _hover={{ scale: "1.04", opacity: "0.92" }}
          _active={{ scale: "0.97" }}
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
            boxShadow: "0 0 40px rgba(99,102,241,0.35)",
          }}
        >
          ✦ 無料で始める
        </s.a>

        {/* フッター */}
        <Text
          tag="p"
          fontClass="caption"
          className={css({ color: "slate.700", mt: "8" })}
        >
          Copyright © 2026 suzuuuuu09 All Rights Reserved.
        </Text>
      </Center>
    </s.main>
  );
}
