import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockConfig = vi.hoisted(() => ({
  betterAuthUrl: "http://localhost:3000",
  betterAuthSecret: "test-secret-that-is-at-least-32-chars",
  databaseUrl: "postgresql://test",
  port: 3000,
  nodeEnv: "test",
}));

vi.mock("../../../config/index.js", () => ({ config: mockConfig }));

const { action } = await import("./signup.js");

function makeSignupRequest(origin: string) {
  const body = new URLSearchParams({
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  });
  return new Request(`${origin}/auth/signup`, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

describe("signup action", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    mockConfig.betterAuthUrl = "http://localhost:3000";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses betterAuthUrl as origin, not request URL origin", async () => {
    // Request comes from a different host than BETTER_AUTH_URL
    const request = makeSignupRequest("https://cloud-preview.example.com");

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-cookie": "session=abc" },
        })
      );

    await action({ request, context: {} as never, params: {} });

    const [signupUrl, signupOpts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(signupUrl).toContain("http://localhost:3000");
    expect(signupUrl).not.toContain("cloud-preview.example.com");
    expect(signupOpts.headers["origin"]).toBe("http://localhost:3000");
  });

  it("strips trailing slash from betterAuthUrl when setting origin header", async () => {
    mockConfig.betterAuthUrl = "http://localhost:3000/";
    const request = makeSignupRequest("http://localhost:3000");

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-cookie": "session=abc" },
        })
      );

    await action({ request, context: {} as never, params: {} });

    const [, signupOpts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(signupOpts.headers["origin"]).toBe("http://localhost:3000");
  });

  it("forwards the configured betterAuthUrl as the fetch base", async () => {
    const request = makeSignupRequest("http://localhost:3000");

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-cookie": "session=xyz" },
        })
      );

    await action({ request, context: {} as never, params: {} });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [signupUrl] = fetchMock.mock.calls[0] as [string];
    const [signinUrl] = fetchMock.mock.calls[1] as [string];
    expect(signupUrl).toBe("http://localhost:3000/api/auth/sign-up/email");
    expect(signinUrl).toBe("http://localhost:3000/api/auth/sign-in/email");
  });

  it("redirects to / on successful sign-up and auto sign-in", async () => {
    const request = makeSignupRequest("http://localhost:3000");

    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-cookie": "session=abc" },
        })
      );

    const result = await action({ request, context: {} as never, params: {} });

    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("location")).toBe("/");
    expect((result as Response).headers.get("set-cookie")).toBe("session=abc");
  });

  it("returns error when auth API rejects sign-up", async () => {
    const request = makeSignupRequest("http://localhost:3000");

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Email already in use" }), {
        status: 422,
      })
    );

    const result = await action({ request, context: {} as never, params: {} });

    expect(result).toEqual({ error: "Email already in use" });
  });

  it("returns generic error when auth API fails without message", async () => {
    const request = makeSignupRequest("http://localhost:3000");

    fetchMock.mockResolvedValueOnce(
      new Response("bad gateway", { status: 502 })
    );

    const result = await action({ request, context: {} as never, params: {} });

    expect(result).toEqual({ error: "Sign-up failed." });
  });

  it("returns validation error for missing fields", async () => {
    const body = new URLSearchParams({ name: "", email: "bad", password: "short" });
    const request = new Request("http://localhost:3000/auth/signup", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    const result = await action({ request, context: {} as never, params: {} });

    expect(result).toEqual({ error: "Please fill in all fields correctly." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
