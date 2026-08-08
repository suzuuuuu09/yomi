import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
const SESSION_COOKIE_SECURE = "__Secure-better-auth.session_token";

export function middleware(request: NextRequest) {
  // パスを取得
  const { pathname } = request.nextUrl;

  // セッションの有無を確認（HTTPSでは__Secure-プレフィックスが付く）
  const hasSession =
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(SESSION_COOKIE_SECURE);

  // ログインページへのアクセス
  if (pathname === "/login") {
    // Cookieの存在だけでは有効なセッションと判断しない。
    // Session Guardが実セッションを確認し、無効なら復旧させる。
    return NextResponse.next();
  }

  if (!hasSession) {
    // セッションがない場合はログインページへリダイレクト
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // APIルートやNext.jsの内部ソースは除外する
  // matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
  // /appと/loginは/loginへリダイレクトさせる
  matcher: ["/app/:path*", "/login"],
};
