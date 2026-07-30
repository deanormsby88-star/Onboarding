import { beforeAll, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-crypto-roundtrip";
});

describe("secret encryption", () => {
  it("round-trips", () => {
    const secret = "0.AXwA1234-refresh-token-value~with_specials.chars";
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("produces different ciphertexts for the same input (fresh IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered payloads", () => {
    const enc = encryptSecret("value");
    const parts = enc.split(".");
    const tampered = [parts[0], parts[1], Buffer.from("attack").toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("cannot decrypt under a different AUTH_SECRET", () => {
    const enc = encryptSecret("value");
    const original = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "rotated-secret";
    expect(() => decryptSecret(enc)).toThrow();
    process.env.AUTH_SECRET = original;
  });
});
