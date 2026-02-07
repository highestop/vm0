import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import {
  createTestRequest,
  createTestDeviceCode,
  findTestDeviceCode,
  findTestCliToken,
} from "../../../../../../src/__tests__/api-test-helpers";
import {
  testContext,
  type UserContext,
} from "../../../../../../src/__tests__/test-helpers";

vi.mock("@clerk/nextjs/server");
vi.mock("@e2b/code-interpreter");
vi.mock("@aws-sdk/client-s3");
vi.mock("@aws-sdk/s3-request-presigner");
vi.mock("@axiomhq/js");

const context = testContext();

/** Generate a unique device code in XXXX-XXXX format */
function generateTestCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Make a token exchange request */
async function exchangeDeviceCode(deviceCode: string) {
  const request = createTestRequest(
    "http://localhost:3000/api/cli/auth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_code: deviceCode }),
    },
  );
  return POST(request);
}

describe("POST /api/cli/auth/token", () => {
  let user: UserContext;

  beforeEach(async () => {
    context.setupMocks();
    user = await context.setupUser();
  });

  it("should return error for invalid device code", async () => {
    const response = await exchangeDeviceCode(generateTestCode());

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid_request");
  });

  it("should return authorization_pending for pending device code", async () => {
    const code = generateTestCode();
    await createTestDeviceCode({ code, status: "pending" });

    const response = await exchangeDeviceCode(code);

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.error).toBe("authorization_pending");
  });

  it("should return expired_token for expired device code", async () => {
    const code = generateTestCode();
    await createTestDeviceCode({
      code,
      status: "pending",
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await exchangeDeviceCode(code);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("expired_token");
  });

  it("should return access_denied and clean up denied device code", async () => {
    const code = generateTestCode();
    await createTestDeviceCode({ code, status: "denied" });

    const response = await exchangeDeviceCode(code);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("access_denied");

    // Verify device code was cleaned up
    const remaining = await findTestDeviceCode(code);
    expect(remaining).toBeUndefined();
  });

  it("should exchange authenticated device code for CLI token", async () => {
    const code = generateTestCode();
    await createTestDeviceCode({
      code,
      status: "authenticated",
      userId: user.userId,
    });

    const response = await exchangeDeviceCode(code);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.access_token).toMatch(/^vm0_live_/);
    expect(body.token_type).toBe("Bearer");
    expect(body.expires_in).toBe(90 * 24 * 60 * 60);

    // Verify token persisted in DB
    const token = await findTestCliToken(body.access_token);
    expect(token).toBeDefined();
    expect(token!.userId).toBe(user.userId);

    // Verify device code cleaned up
    const remaining = await findTestDeviceCode(code);
    expect(remaining).toBeUndefined();
  });

  it("should auto-create scope for user without existing scope", async () => {
    const newUserId = `no-scope-${Date.now()}`;
    const code = generateTestCode();
    await createTestDeviceCode({
      code,
      status: "authenticated",
      userId: newUserId,
    });

    const response = await exchangeDeviceCode(code);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.access_token).toMatch(/^vm0_live_/);
  });
});
