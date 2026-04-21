import crypto from 'crypto-js';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

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

const uint8ArrayToBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const base64ToUint8Array = (value) => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
};

export const encryptMessageGCM = async (message, key) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textEncoder.encode(message)
  );

  const encryptedBytes = new Uint8Array(encrypted);
  const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    encryptedMessage: uint8ArrayToBase64(ciphertext),
    iv: uint8ArrayToBase64(iv),
    authTag: uint8ArrayToBase64(authTag)
  };
};

export const decryptMessageGCM = async (encryptedMessage, key, iv, authTag) => {
  const ciphertext = base64ToUint8Array(encryptedMessage);
  const ivBytes = base64ToUint8Array(iv);
  const tagBytes = base64ToUint8Array(authTag);

  const merged = new Uint8Array(ciphertext.length + tagBytes.length);
  merged.set(ciphertext, 0);
  merged.set(tagBytes, ciphertext.length);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    merged
  );

  return textDecoder.decode(decrypted);
};
