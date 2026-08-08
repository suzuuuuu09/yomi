import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "@/middleware";

describe("authentication middleware", () => {
  it("keeps the login page reachable with a stale session cookie", () => {
    const request = new NextRequest("http://localhost/login", {
      headers: {
        cookie: "better-auth.session_token=stale-token",
      },
    });

    const response = middleware(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects an app request without a session cookie", () => {
    const request = new NextRequest("http://localhost/app");
    const response = middleware(request);

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });
});
