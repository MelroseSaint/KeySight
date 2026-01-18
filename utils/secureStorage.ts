
import { StorageBlock, SecurityEvent } from '../types';

export class SecureStorage {
  private chain: StorageBlock[] = [];
  private encryptionKey: unknown; // Typed as unknown to prevent emitDecoratorMetadata issues
  private storage: Map<number, ArrayBuffer> = new Map();

  constructor() {
    this.chain = [];
    this.encryptionKey = undefined;
    this.storage = new Map();
  }

  // Initialize storage with a derived key
  async initialize(masterKey: string): Promise<boolean> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(masterKey),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );
    
    // Derive AES-GCM key
    this.encryptionKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode("KEYSIGHT_LOCAL_SALT"),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // Create Genesis Block if empty
    if (this.chain.length === 0) {
      this.chain.push({
        index: 0,
        previousHash: "00000000000000000000000000000000",
        timestamp: Date.now(),
        dataHash: "GENESIS_BLOCK",
        signature: "SYSTEM_INIT"
      });
    }
    return true;
  }

  // Calculate SHA-256 hash
  async sha256(data: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getKey(): any {
    if (!this.encryptionKey) {
      throw new Error("Storage locked: Encryption key not initialized");
    }
    return this.encryptionKey;
  }

  // Append a log or data chunk
  async append(data: any): Promise<StorageBlock> {
    const key = this.getKey();

    const prevBlock = this.chain[this.chain.length - 1];
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    const dataHash = await this.sha256(dataString);
    
    // Encrypt data (AES-GCM)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      new TextEncoder().encode(dataString)
    );

    // Store (IV + Ciphertext)
    const storedBlob = new Uint8Array(iv.byteLength + encryptedContent.byteLength);
    storedBlob.set(iv, 0);
    storedBlob.set(new Uint8Array(encryptedContent), iv.byteLength);

    const newIndex = prevBlock.index + 1;
    this.storage.set(newIndex, storedBlob.buffer);

    const newBlock: StorageBlock = {
      index: newIndex,
      previousHash: await this.sha256(JSON.stringify(prevBlock)),
      timestamp: Date.now(),
      dataHash: dataHash,
      signature: `SIG_${Date.now()}_${Math.random().toString(16).substr(2, 8)}`
    };

    this.chain.push(newBlock);
    return newBlock;
  }

  async decrypt(index: number): Promise<any> {
    try {
        const key = this.getKey();
        const encryptedData = this.storage.get(index);
        if (!encryptedData) return null;

        const encryptedArray = new Uint8Array(encryptedData);
        const iv = encryptedArray.slice(0, 12);
        const ciphertext = encryptedArray.slice(12);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            ciphertext
        );
        const dec = new TextDecoder();
        const jsonStr = dec.decode(decryptedBuffer);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Decryption failed for block " + index, e);
        return null;
    }
  }

  // Helper to lock an item (Evidence Mode)
  async lockItem(targetBlockIndex: number, user: string): Promise<boolean> {
    await this.append({
        type: 'LOCK_EVIDENCE',
        targetIndex: targetBlockIndex,
        timestamp: Date.now(),
        user: user,
        description: `Evidence locked by ${user}`
    });
    return true;
  }

  // Helper to unlock an item
  async unlockItem(targetBlockIndex: number, user: string): Promise<boolean> {
    await this.append({
        type: 'UNLOCK_EVIDENCE',
        targetIndex: targetBlockIndex,
        timestamp: Date.now(),
        user: user,
        description: `Evidence unlocked by ${user}`
    });
    return true;
  }

  // Helper to delete an item (Tombstone)
  async deleteItem(targetBlockIndex: number, user: string): Promise<boolean> {
     await this.append({
         type: 'TOMBSTONE',
         targetIndex: targetBlockIndex,
         timestamp: Date.now(),
         user: user,
         description: `Item deleted by ${user}`
     });
     return true;
  }

  // Reconstruct state by replaying the chain
  async getAllItems(): Promise<any[]> {
     const rawItems = new Map<number, any>();
     const locks = new Set<number>();
     const deletions = new Set<number>();

     // 1. Decrypt everything first
     // Skip genesis block at index 0
     for (let i = 1; i < this.chain.length; i++) {
        const block = this.chain[i];
        const content = await this.decrypt(block.index);
        
        if (content) {
            const item = {
                _blockIndex: block.index,
                _blockHash: block.dataHash,
                _timestamp: block.timestamp,
                ...content
            };

            if (content.type === 'LOCK_EVIDENCE' && content.targetIndex) {
                locks.add(content.targetIndex);
                rawItems.set(block.index, item);
            } else if (content.type === 'UNLOCK_EVIDENCE' && content.targetIndex) {
                locks.delete(content.targetIndex);
                rawItems.set(block.index, item);
            } else if (content.type === 'TOMBSTONE' && content.targetIndex) {
                deletions.add(content.targetIndex);
                rawItems.set(block.index, item);
            } else {
                rawItems.set(block.index, item);
            }
        }
     }

     // 2. Filter and Decorate
     const result: any[] = [];
     for (const [index, item] of rawItems.entries()) {
         // If it's a content type (video/image) and deleted, skip it
         if (deletions.has(index)) {
             continue; 
         }
         
         // Apply lock status
         if (locks.has(index)) {
             item.locked = true;
         } else {
             item.locked = false;
         }

         result.push(item);
     }

     return result.reverse(); // Newest first
  }

  getChainLength(): number {
    return this.chain.length;
  }

  getStorageUsage(): number {
    let size = 0;
    this.storage.forEach(blob => size += blob.byteLength);
    return size;
  }
}

export const secureStorage = new SecureStorage();
