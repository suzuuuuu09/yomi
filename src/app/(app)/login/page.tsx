"use client";

import Image from "next/image";
import { css } from "styled-system/css";
import { Box, Stack, styled as s } from "styled-system/jsx";
import StarfieldBackground from "@/components/shares/StarfieldBackground";
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
      <StarfieldBackground />

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
        <Stack gap="2" alignItems="center">
          <Box position="relative">
            <Image
              src="/yomi.png"
              alt="YOMi"
              width={60}
              height={60}
              className={css({
                borderRadius: "18px",
                filter:
                  "drop-shadow(0 0 16px #6467f28c) drop-shadow(0 0 40px #a855f747)",
                animation: "float 6s ease-in-out infinite",
              })}
              style={{ objectFit: "contain" }}
              priority
            />
          </Box>

          <Text
            tag="h1"
            fontClass="title2-bold"
            className={css({
              letterSpacing: "0.08em",
              lineHeight: "1",
              background: "linear-gradient(135deg,#c7d2fe,#a78bfa,#f0abfc)",
              textShadow: "0 0 24px #a855f740",
            })}
            style={{
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
            _hover: { bg: "white/10", borderColor: "white/20" },
            _active: { bg: "white/14" },
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
