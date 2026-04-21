const KEYPAIR_STORAGE_KEY = 'e2ee_identity_keypair_v1';
const IDB_DATABASE = 'encrypted_chat_e2ee';
const IDB_STORE = 'keys';
const IDB_RECORD_ID = 'identity_keypair_v1';

const encoder = new TextEncoder();

const toBase64 = (bytes) => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const fromBase64 = (str) => {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const importPrivateKey = async (pkcs8Bytes) => {
  return crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
};

const importPublicKey = async (spkiBytes) => {
  return crypto.subtle.importKey(
    'spki',
    spkiBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
};

const openKeyDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DATABASE, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const readKeypairFromIndexedDb = async () => {
  const db = await openKeyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(IDB_RECORD_ID);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};

const writeKeypairToIndexedDb = async (keypair) => {
  const db = await openKeyDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ id: IDB_RECORD_ID, ...keypair });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
};

export const loadOrCreateIdentityKeyPair = async () => {
  const idbStored = await readKeypairFromIndexedDb();
  if (idbStored) {
    return {
      publicKey: idbStored.publicKey,
      privateKey: await importPrivateKey(fromBase64(idbStored.privateKey))
    };
  }

  const legacyStored = localStorage.getItem(KEYPAIR_STORAGE_KEY);
  if (legacyStored) {
    const parsed = JSON.parse(legacyStored);
    await writeKeypairToIndexedDb(parsed);
    localStorage.removeItem(KEYPAIR_STORAGE_KEY);
    return {
      publicKey: parsed.publicKey,
      privateKey: await importPrivateKey(fromBase64(parsed.privateKey))
    };
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const [publicSpki, privatePkcs8] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  ]);

  const exported = {
    publicKey: toBase64(new Uint8Array(publicSpki)),
    privateKey: toBase64(new Uint8Array(privatePkcs8))
  };

  await writeKeypairToIndexedDb(exported);

  return {
    publicKey: exported.publicKey,
    privateKey: keyPair.privateKey
  };
};

export const deriveConversationKey = async (
  localPrivateKey,
  remotePublicKeyBase64,
  currentUserId,
  remoteUserId
) => {
  const remotePublicKey = await importPublicKey(fromBase64(remotePublicKeyBase64));
  const sharedSecretBits = await crypto.subtle.deriveBits(
    {
      name: 'ECDH',
      public: remotePublicKey
    },
    localPrivateKey,
    256
  );

  const sortedIds = [currentUserId, remoteUserId].sort();
  const context = encoder.encode(`chat-e2ee-v1:${sortedIds.join(':')}`);

  const merged = new Uint8Array(sharedSecretBits.byteLength + context.byteLength);
  merged.set(new Uint8Array(sharedSecretBits), 0);
  merged.set(context, sharedSecretBits.byteLength);

  const digest = await crypto.subtle.digest('SHA-256', merged);
  const keyBytes = new Uint8Array(digest);

  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
};
