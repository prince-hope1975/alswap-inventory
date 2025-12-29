import crypto from "crypto";
import "server-only";
import { env } from "~/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12; // recommended for GCM
const KEY_LENGTH_BYTES = 32; // 256-bit

function getSecret(): string {
  // This app uses AUTH_SECRET as the stable server secret (see src/env.js).
  const secret = env.AUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Missing AUTH_SECRET: required for encrypting/decrypting sensitive tenant config (Paystack secret key).",
    );
  }
  return secret;
}

function deriveKey(): Buffer {
  // Stable derivation from AUTH_SECRET; salt is app-specific but constant.
  return crypto.scryptSync(getSecret(), "alswap-inventory:encryption", KEY_LENGTH_BYTES);
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Format: base64(iv).base64(tag).base64(ciphertext)
 */
export function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const key = deriveKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}.${tag.toString("base64")}.${ciphertext.toString("base64")}`;
}

export function decryptString(payload: string): string {
  const [ivB64, tagB64, cipherB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !cipherB64) {
    throw new Error("Invalid encrypted payload format.");
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(cipherB64, "base64");
  const key = deriveKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return plaintext.toString("utf8");
}


