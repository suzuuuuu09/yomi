import type { AuthInstance } from "@/server/lib/auth";

type BetterAuthUser = NonNullable<
  Awaited<ReturnType<AuthInstance["api"]["getSession"]>>
>["user"];

type BetterAuthSession = NonNullable<
  Awaited<ReturnType<AuthInstance["api"]["getSession"]>>
>["session"];

export type AppEnv = {
  Bindings: {
    yomi_db: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    FRONTEND_URL: string;
    GOOGLE_API_KEY: string;
  };
  Variables: {
    user: BetterAuthUser | null;
    session: BetterAuthSession | null;
  };
};
