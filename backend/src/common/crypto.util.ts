import * as CryptoJS from 'crypto-js';
import { createHash } from 'crypto';

export class CryptoUtil {
  private static getKey(secret: string) {
    // Derive 256-bit key from secret
    return CryptoJS.enc.Utf8.parse(secret.padEnd(32, '0').slice(0, 32));
  }

  /** Encrypt string with AES-256-CBC */
  static encrypt(plaintext: string, secret: string): string {
    const key = this.getKey(secret);
    const iv  = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv,
      mode:    CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    // Prepend IV to ciphertext for decryption
    return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
  }

  /** Decrypt AES-256-CBC */
  static decrypt(ciphertext: string, secret: string): string {
    const [ivHex, encryptedStr] = ciphertext.split(':');
    const key = this.getKey(secret);
    const iv  = CryptoJS.enc.Hex.parse(ivHex);
    const decrypted = CryptoJS.AES.decrypt(encryptedStr, key, {
      iv,
      mode:    CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /** SHA-256 hash (hex) */
  static sha256(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  /** SHA-256 as bytes32 hex for Solidity */
  static sha256Bytes32(data: string): string {
    return '0x' + createHash('sha256').update(data).digest('hex');
  }
}
