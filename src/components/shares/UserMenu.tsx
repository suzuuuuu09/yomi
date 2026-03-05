"use client";

import Image from "next/image";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import Card from "~liftkit/card";
import Text from "~liftkit/text";
import { Box, HStack } from "styled-system/jsx";
import { sva } from "styled-system/css";

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
      </HStack>
    );
  }

  const unauthStyles = userMenuStyles({ status: "idle" });
  return (
    <Box
      as="button"
      onClick={() => {
        document.cookie = "better-auth.session_token=; Max-Age=0; path=/;"; // クッキーを削除（ローカル）
        document.cookie =
          "__Secure-better-auth.session_token=; Max-Age=0; path=/; Secure;"; // クッキーを削除（本番）
        window.location.href = "/login";
      }}
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
