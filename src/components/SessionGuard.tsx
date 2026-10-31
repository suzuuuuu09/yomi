"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Center, Circle, Flex, styled as s } from "styled-system/jsx";
import { authClient } from "@/lib/auth-client";

export default function SessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || session?.user) return;

    void authClient.signOut();
    router.replace("/login");
  }, [isPending, router, session?.user]);

  if (isPending || !session?.user) {
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

  return children;
}
