import { type NextRequest, NextResponse } from "next/server";

export function proxy(_request: NextRequest) {
  // ゲストの利用選択はブラウザー内にあるため、画面の入場判定はSessionGuardで行う。
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/login"],
};
