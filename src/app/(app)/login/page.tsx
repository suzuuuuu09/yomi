"use client";

import { useMemo } from "react";
import { css } from "styled-system/css";
import { Box, Stack, styled as s } from "styled-system/jsx";
import { signIn } from "@/lib/auth-client";
import Text from "~liftkit/text";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// 星の背景
function StarfieldBackground() {
  // ランダムな星を生成
  const stars = useMemo(() => {
    const starCount =
      typeof window !== "undefined" && window.innerWidth < 768 ? 80 : 150;
    return Array.from({ length: starCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.2,
      duration: Math.random() * 4 + 2.5,
      delay: Math.random() * 3,
    }));
  }, []);

  return (
    <>
      {/* グロー1 */}
      <Box
        position="absolute"
        top="10%"
        left="10%"
        width="400px"
        height="400px"
        borderRadius="50%"
        background="radial-gradient(circle, rgba(129,140,248,0.15) 0%, transparent 70%)"
        filter="blur(60px)"
        pointerEvents="none"
      />

      {/* グロー2 */}
      <Box
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <Box
        position="absolute"
        pointerEvents="none"
        inset={0}
        background={`
					radial-gradient(ellipse 800px 600px at 20% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
					radial-gradient(ellipse 700px 500px at 80% 70%, rgba(168, 85, 247, 0.06) 0%, transparent 50%),
					radial-gradient(ellipse 600px 400px at 50% 50%, rgba(236, 72, 153, 0.04) 0%, transparent 50%)
				`}
      />

      {/* 星フィールド */}
      {stars.map((star) => (
        <Box
          key={star.id}
          position="absolute"
          borderRadius="full"
          bg="white"
          pointerEvents="none"
          animationName="twinkle"
          animationTimingFunction="ease-in-out"
          animationIterationCount="infinite"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDuration: `${star.duration}s`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </>
  );
}

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    await signIn.social({
      provider: "google",
      callbackURL: "/app",
    });
  };

  return (
    <s.main
      position="relative"
      w="screen"
      h="screen"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="#020617"
      overflow="hidden"
    >
      {/* 星空背景 */}
      <StarfieldBackground />

      {/* コンテンツ */}
      <Stack
        gap="8"
        alignItems="center"
        p="10"
        maxW="sm"
        w="full"
        position="relative"
        zIndex="10"
        className={css({
          borderRadius: "3xl",
          border: "1px solid",
          borderColor: "white/8",
          background: "color-mix(in srgb, transparent 15%, #020617 85%)",
          backdropFilter: "blur(20px)",
          shadow: "2xl",
          shadowColor: "black/50",
        })}
      >
        {/* ロゴ */}
        <Stack gap="2" alignItems="center">
          <Text
            tag="h1"
            fontClass="title2-bold"
            className={css({ letterSpacing: "0.2em" })}
            style={{
              background: "linear-gradient(135deg,#818cf8,#a855f7,#ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            YOMi
          </Text>
          <Text
            tag="p"
            fontClass="callout"
            className={css({ color: "slate.400", textAlign: "center" })}
          >
            あなたの読書宇宙へようこそ
          </Text>
        </Stack>

        {/* Googleログインボタン */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3",
            w: "full",
            px: "5",
            py: "3",
            rounded: "xl",
            fontSize: "sm",
            fontWeight: "medium",
            color: "white",
            border: "1px solid",
            borderColor: "white/12",
            bg: "white/6",
            cursor: "pointer",
            transitionProperty: "all",
            transitionDuration: "200ms",
            _hover: {
              bg: "white/10",
              borderColor: "white/20",
            },
            _active: {
              bg: "white/14",
            },
          })}
        >
          <GoogleIcon />
          Google アカウントでログイン
        </button>

        <Text
          tag="p"
          fontClass="caption"
          className={css({ color: "slate.600", textAlign: "center" })}
        >
          ログインすることで、読書記録がクラウドに保存されます
        </Text>

        {/* コピーライト */}
        <Text
          tag="p"
          fontClass="caption"
          className={css({ color: "slate.600", textAlign: "center" })}
        >
          Copyright © 2026 suzuuuuu09 All Rights Reserved.
        </Text>
      </Stack>
    </s.main>
  );
}
