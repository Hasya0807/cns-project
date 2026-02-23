const crypto = require('crypto');

// Generate a random encryption key for each user pair or use a shared key
// For production, consider using key exchange protocol (e.g., Diffie-Hellman)
const algorithm = 'aes-256-gcm';

/**
 * Generate a random key
 * @returns {Buffer} 32-byte key for AES-256
 */
const generateKey = () => {
  return crypto.randomBytes(32);
};

/**
 * Encrypt a message using AES-256-GCM
 * @param {string} message - Plain text message
 * @param {Buffer|string} key - Encryption key (32 bytes for AES-256)
 * @returns {Object} { encryptedMessage, iv, authTag }
 */
const encryptMessage = (message, key) => {
  try {
    // Convert key to buffer if it's a string (hex)
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    
    // Encrypt the message
    let encrypted = cipher.update(message, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag for GCM mode
    const authTag = cipher.getAuthTag();
    
    return {
      encryptedMessage: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt a message using AES-256-GCM
 * @param {string} encryptedMessage - Encrypted message in hex
 * @param {Buffer|string} key - Encryption key (32 bytes for AES-256)
 * @param {string} iv - Initialization vector in hex
 * @param {string} authTag - Authentication tag in hex
 * @returns {string} Decrypted message
 */
const decryptMessage = (encryptedMessage, key, iv, authTag) => {
  try {
    // Convert inputs to proper formats
    const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;
    const ivBuffer = Buffer.from(iv, 'hex');
    const authTagBuffer = Buffer.from(authTag, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
    
    // Set authentication tag
    decipher.setAuthTag(authTagBuffer);
    
    // Decrypt the message
    let decrypted = decipher.update(encryptedMessage, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

/**
 * Generate a hash of the message for integrity checking
 * @param {string} message - Message to hash
 * @returns {string} SHA-256 hash in hex
 */
const hashMessage = (message) => {
  return crypto.createHash('sha256').update(message).digest('hex');
};

/**
 * Verify message integrity
 * @param {string} message - Original message
 * @param {string} hash - Hash to verify against
 * @returns {boolean} True if hash matches
 */
const verifyMessageHash = (message, hash) => {
  const messageHash = hashMessage(message);
  return messageHash === hash;
};

module.exports = {
  generateKey,
  encryptMessage,
  decryptMessage,
  hashMessage,
  verifyMessageHash
};
