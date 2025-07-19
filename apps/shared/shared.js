/**
 * Shared Utilities - IndexedDB Key-Value Storage
 * 
 * Main purpose: Provides IndexedDB-based key-value storage for apps that exceed localStorage limits.
 * Handles database initialization, connection management, and CRUD operations.
 * 
 * Key methods:
 * - setItem: Store key-value pairs in IndexedDB
 * - getItem: Retrieve values by key from IndexedDB
 */

class SharedDB {
    constructor() {
        this.dbName = 'RQIWebSnippetsDB';
        this.version = 1;
        this.storeName = 'keyValueStore';
        this.db = null;
    }

    async init() {
        if (this.db) return this.db;
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'key' });
                }
            };
        });
    }

    async setItem(key, value) {
        try {
            await this.init();
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put({ key, value, timestamp: Date.now() });
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve();
            });
        } catch (error) {
            console.warn('IndexedDB setItem failed, falling back to localStorage:', error);
            try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            } catch (localError) {
                throw new Error(`Both IndexedDB and localStorage failed: ${error.message}, ${localError.message}`);
            }
        }
    }

    async getItem(key) {
        try {
            await this.init();
            
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
            });
        } catch (error) {
            console.warn('IndexedDB getItem failed, falling back to localStorage:', error);
            try {
                const item = localStorage.getItem(key);
                return item;
            } catch (localError) {
                console.warn('localStorage fallback also failed:', localError);
                return null;
            }
        }
    }
}

// Create global instance
window.sharedDB = new SharedDB();

// Convenience methods for easy usage
window.setItem = async (key, value) => {
    return await window.sharedDB.setItem(key, value);
};

window.getItem = async (key) => {
    return await window.sharedDB.getItem(key);
};
