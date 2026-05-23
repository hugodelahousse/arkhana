import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockConfig = vi.hoisted(() => ({
  betterAuthUrl: "http://localhost:3000",
  betterAuthSecret: "test-secret-that-is-at-least-32-chars",
  databaseUrl: "postgresql://test",
  port: 3000,
  nodeEnv: "test",
}));

vi.mock("../../../config/index.js", () => ({ config: mockConfig }));

const { action } = await import("./signin.js");

function makeSigninRequest(origin: string) {
  const body = new URLSearchParams({
    email: "test@example.com",
    password: "password123",
  });
  return new Request(`${origin}/auth/signin`, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
}

describe("signin action", () => {
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
    const request = makeSigninRequest("https://cloud-preview.example.com");

    fetchMock.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "set-cookie": "session=abc" },
      })
    );

    await action({ request, context: {} as never, params: {} });

    const [signinUrl, signinOpts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(signinUrl).toContain("http://localhost:3000");
    expect(signinUrl).not.toContain("cloud-preview.example.com");
    expect(signinOpts.headers["origin"]).toBe("http://localhost:3000");
  });

  it("strips trailing slash from betterAuthUrl when setting origin header", async () => {
    mockConfig.betterAuthUrl = "http://localhost:3000/";
    const request = makeSigninRequest("http://localhost:3000");

    fetchMock.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "set-cookie": "session=abc" },
      })
    );

    await action({ request, context: {} as never, params: {} });

    const [, signinOpts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(signinOpts.headers["origin"]).toBe("http://localhost:3000");
  });

  it("redirects to /dashboard on successful sign-in", async () => {
    const request = makeSigninRequest("http://localhost:3000");

    fetchMock.mockResolvedValueOnce(
      new Response("{}", {
        status: 200,
        headers: { "set-cookie": "session=abc" },
      })
    );

    const result = await action({ request, context: {} as never, params: {} });

    expect((result as Response).status).toBe(302);
    expect((result as Response).headers.get("location")).toBe("/dashboard");
    expect((result as Response).headers.get("set-cookie")).toBe("session=abc");
  });

  it("returns error when auth API rejects credentials", async () => {
    const request = makeSigninRequest("http://localhost:3000");

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Invalid credentials" }), {
        status: 401,
      })
    );

    const result = await action({ request, context: {} as never, params: {} });

    expect(result).toEqual({ error: "Invalid credentials" });
  });

  it("returns validation error for missing fields", async () => {
    const body = new URLSearchParams({ email: "bad-email", password: "" });
    const request = new Request("http://localhost:3000/auth/signin", {
      method: "POST",
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    const result = await action({ request, context: {} as never, params: {} });

    expect(result).toEqual({ error: "Please enter a valid email and password." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
