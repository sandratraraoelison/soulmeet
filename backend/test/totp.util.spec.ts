import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  otpauthUrl,
  totpCode,
  verifyTotp,
} from '../src/modules/auth/totp.util';

describe('TOTP utility', () => {
  it('generates a base32 secret and a 6-digit code', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(totpCode(secret)).toMatch(/^\d{6}$/);
  });

  it('verifies the current code and rejects invalid ones', () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret);
    expect(verifyTotp(secret, code)).toBe(true);
    expect(verifyTotp(secret, '000000')).toBe(false);
    expect(verifyTotp(secret, 'not-a-code')).toBe(false);
  });

  it('accepts a code from a neighbouring 30s window (clock drift)', () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret, Date.now() - 30_000);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it('builds an otpauth URL carrying the secret and issuer', () => {
    const url = otpauthUrl('ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', 'admin@example.com', 'Soulmeet Admin');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('issuer=');
    expect(url).toContain('Soulmeet');
    expect(url).toContain('secret=ABCDEFGHIJKLMNOPQRSTUVWXYZ234567');
  });

  it('hashes recovery codes deterministically with the pepper', () => {
    const codes = generateRecoveryCodes(8);
    expect(codes).toHaveLength(8);
    const pepper = 'pepper';
    expect(hashRecoveryCode(codes[0]!, pepper)).toBe(hashRecoveryCode(codes[0]!, pepper));
    expect(hashRecoveryCode(codes[0]!, pepper)).not.toBe(hashRecoveryCode(codes[1]!, pepper));
    expect(hashRecoveryCode(codes[0]!, pepper)).not.toBe(codes[0]);
  });
});
