import { describe, expect, it } from "vitest";
import { hashPassword, randomToken, sha256, verifyPassword } from "../../worker/auth";

describe("authentication primitives", () => {
  it("uses salted password hashes and verifies in constant-shape comparison", async () => {
    const first = await hashPassword("correct horse battery staple", undefined, 1_000);
    const second = await hashPassword("correct horse battery staple", undefined, 1_000);
    expect(first.hash).not.toBe(second.hash);
    expect(await verifyPassword("correct horse battery staple", first.hash, first.salt, first.iterations)).toBe(true);
    expect(await verifyPassword("wrong password", first.hash, first.salt, first.iterations)).toBe(false);
  });

  it("creates opaque high-entropy tokens and stable digests", async () => {
    const token = randomToken();
    expect(token.length).toBeGreaterThan(40);
    expect(token).not.toMatch(/[+/=]/);
    expect(await sha256(token)).toHaveLength(64);
  });
});
