import { createHmac, randomBytes, randomInt } from 'crypto';

/**
 * Minimal RFC 6238 (TOTP) and recovery-code helpers backed by Node's crypto.
 * The secret is stored base32; the dashboard never receives a plaintext
 * recovery code twice, so the raw secret and codes are the only secrets.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateTotpSecret(bytes = 20): string {
  const buffer = randomBytes(bytes);
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.toUpperCase().replace(/=+$/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totpCode(
  secret: string,
  timestamp = Date.now(),
  stepSeconds = 30,
  digits = 6,
): string {
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', base32Decode(secret))
    .update(counterBuffer)
    .digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3];
  return String(code % 10 ** digits).padStart(digits, '0');
}

/** Accepts the current code plus `window` steps in each direction (drift). */
export function verifyTotp(
  secret: string,
  code: string,
  window = 1,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Date.now();
  for (let offset = -window; offset <= window; offset++) {
    if (totpCode(secret, now + offset * 30_000) === code) return true;
  }
  return false;
}

export function otpauthUrl(
  secret: string,
  accountName: string,
  issuer: string,
): string {
  const label = `${issuer}:${accountName}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRecoveryCodes(count = 8, length = 10): string[] {
  const codes: string[] = [];
  for (let index = 0; index < count; index++) {
    let code = '';
    for (let position = 0; position < length; position++) {
      code += RECOVERY_ALPHABET[randomInt(0, RECOVERY_ALPHABET.length)];
    }
    codes.push(code);
  }
  return codes;
}

/** HMAC the recovery code so leaked database rows cannot be replayed. */
export function hashRecoveryCode(code: string, pepper: string): string {
  return createHmac('sha256', pepper).update(`recovery:${code}`).digest('hex');
}
