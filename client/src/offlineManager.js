const QUEUE_KEY = "offline_mutation_queue";
const CACHE_PREFIX = "api_cache_";

class OfflineManager {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    this.isOnline = navigator.onLine;

    this.apiClient = null;

    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });
  }

  setApiClient(client) {
    this.apiClient = client;
  }

  // --- Caching (Read) ---

  getCacheKey(url, params) {
    return CACHE_PREFIX + url + JSON.stringify(params || {});
  }

  cacheResponse(url, params, data) {
    try {
      const key = this.getCacheKey(url, params);
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp: Date.now(),
          data: data,
        })
      );
    } catch (e) {
      console.warn("Quota exceeded or storage error", e);
      // Optional: Clear old cache if needed
    }
  }

  getCachedResponse(url, params) {
    const key = this.getCacheKey(url, params);
    const cached = localStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached).data;
    }
    return null;
  }

  // --- Queueing (Write) ---

  addToQueue(requestConfig) {
    const id = Date.now().toString();
    const item = {
      id,
      config: {
        url: requestConfig.url,
        method: requestConfig.method,
        data: requestConfig.data,
        params: requestConfig.params,
        headers: requestConfig.headers,
      },
      timestamp: Date.now(),
    };

    this.queue.push(item);
    this.saveQueue();
    return item;
  }

  saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    // Notify UI of queue update if needed
    window.dispatchEvent(new Event("offline-queue-updated"));
  }

  removeFromQueue(id) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
  }

  async processQueue(apiClient) {
    const client = apiClient || this.apiClient;
    if (this.queue.length === 0 || !this.isOnline || !client) return;

    console.log(`Processing ${this.queue.length} offline items...`);

    // Clone queue to avoid mutation issues during iteration
    const currentQueue = [...this.queue];

    for (const item of currentQueue) {
      try {
        console.log(`Replaying ${item.config.method} ${item.config.url}`);
        await apiClient(item.config);
        this.removeFromQueue(item.id);
      } catch (error) {
        console.error("Failed to sync item", item, error);
        // If 4xx error, maybe remove it? For now keep retrying or manual intervention.
        // If 400/404/403, remove it to prevent endless loop.
        if (
          error.response &&
          error.response.status >= 400 &&
          error.response.status < 500
        ) {
          this.removeFromQueue(item.id);
        }
      }
    }
  }

  getQueueSize() {
    return this.queue.length;
  }
}

export const offlineManager = new OfflineManager();
