import crypto from 'crypto-js';

// Using crypto-js library - install with: npm install crypto-js

// Generate encryption key
export const generateEncryptionKey = () => {
  // Generate a random 32-byte key (256 bits)
  const wordArray = crypto.lib.WordArray.random(32);
  return crypto.enc.Hex.stringify(wordArray);
};

// Generate a shared conversation key based on both user IDs
// This ensures both users use the same key for their conversation
export const generateSharedKey = (userId1, userId2) => {
  // Sort user IDs to ensure same key regardless of who initiates
  const sortedIds = [userId1, userId2].sort();
  const combined = sortedIds.join('-');
  
  // Generate deterministic key from user IDs
  const hash = crypto.SHA256(combined);
  return hash.toString(crypto.enc.Hex);
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

// Store key in localStorage (persists even after browser close)
export const storeEncryptionKey = (userId, key) => {
  localStorage.setItem(`enc_key_${userId}`, key);
};

// Retrieve encryption key
export const getEncryptionKey = (userId) => {
  // First check localStorage
  let key = localStorage.getItem(`enc_key_${userId}`);
  
  // If not found, check sessionStorage (for migration from old version)
  if (!key) {
    key = sessionStorage.getItem(`enc_key_${userId}`);
    if (key) {
      // Migrate to localStorage
      localStorage.setItem(`enc_key_${userId}`, key);
      sessionStorage.removeItem(`enc_key_${userId}`);
      console.log('Migrated encryption key from sessionStorage to localStorage');
    }
  }
  
  return key;
};

// Remove encryption key
export const removeEncryptionKey = (userId) => {
  localStorage.removeItem(`enc_key_${userId}`);
  sessionStorage.removeItem(`enc_key_${userId}`);
};
