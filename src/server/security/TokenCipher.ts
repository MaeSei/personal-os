import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

interface TokenCipher {
  decrypt(encrypted: string): string;
  encrypt(plainText: string): string;
}

/** AES-GCM envelope for long-lived OAuth credentials stored by Atlas. */
class AesGcmTokenCipher implements TokenCipher {
  constructor(private readonly key: Buffer) {
    if (key.byteLength !== 32) {
      throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
    }
  }

  static fromBase64Key(value: string): AesGcmTokenCipher {
    return new AesGcmTokenCipher(Buffer.from(value, "base64"));
  }

  decrypt(encrypted: string): string {
    const [version, ivValue, tagValue, cipherText] = encrypted.split(".");
    if (version !== VERSION || !ivValue || !tagValue || !cipherText) {
      throw new Error("The stored Calendar credential is invalid.");
    }
    const decipher = createDecipheriv(
      ALGORITHM,
      this.key,
      Buffer.from(ivValue, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(cipherText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  encrypt(plainText: string): string {
    if (!plainText) throw new Error("An empty OAuth token cannot be stored.");
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    return [
      VERSION,
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }
}

export { AesGcmTokenCipher };
export type { TokenCipher };
