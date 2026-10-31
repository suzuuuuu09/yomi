import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "@/proxy";

describe("authentication proxy", () => {
  it.each(["better-auth.session_token", "__Secure-better-auth.session_token"])(
    "lets app requests with %s reach session validation",
    (cookieName) => {
      const request = new NextRequest("https://localhost/app", {
        headers: { cookie: `${cookieName}=test-token` },
      });

      const response = proxy(request);

      expect(response.headers.get("location")).toBeNull();
    },
  );

  it("keeps the login page reachable with a stale session cookie", () => {
    const request = new NextRequest("http://localhost/login", {
      headers: {
        cookie: "better-auth.session_token=stale-token",
      },
    });

    const response = proxy(request);

    expect(response.headers.get("location")).toBeNull();
  });

  it("still redirects an app request without a session cookie", () => {
    const request = new NextRequest("http://localhost/app");
    const response = proxy(request);

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });
});
