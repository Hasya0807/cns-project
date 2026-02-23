import crypto from 'crypto-js';

// Using crypto-js library - install with: npm install crypto-js

// Generate encryption key
export const generateEncryptionKey = () => {
  // Generate a random 32-byte key (256 bits)
  return Array.from(crypto.lib.WordArray.random(32))
    .map(x => ('0' + x.toString(16)).slice(-2))
    .join('');
};

// Encrypt message using AES-256
export const encryptMessageClient = (message, key) => {
  try {
    // Create IV
    const iv = crypto.lib.WordArray.random(16);
    
    // Encrypt using AES
    const encrypted = crypto.AES.encrypt(message, crypto.enc.Hex.parse(key), {
      iv: iv,
      mode: crypto.mode.CBC,
      padding: crypto.pad.Pkcs7
    });

    return {
      encryptedMessage: encrypted.toString(),
      iv: iv.toString()
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

// Decrypt message using AES-256
export const decryptMessageClient = (encryptedMessage, key, iv) => {
  try {
    const decrypted = crypto.AES.decrypt(
      encryptedMessage,
      crypto.enc.Hex.parse(key),
      {
        iv: crypto.enc.Hex.parse(iv),
        mode: crypto.mode.CBC,
        padding: crypto.pad.Pkcs7
      }
    );

    return crypto.enc.Utf8.stringify(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

// Store key in sessionStorage (cleared when tab closes)
export const storeEncryptionKey = (userId, key) => {
  sessionStorage.setItem(`enc_key_${userId}`, key);
};

// Retrieve encryption key
export const getEncryptionKey = (userId) => {
  return sessionStorage.getItem(`enc_key_${userId}`);
};

// Remove encryption key
export const removeEncryptionKey = (userId) => {
  sessionStorage.removeItem(`enc_key_${userId}`);
};
