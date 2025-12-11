import axios from "axios";

const API_URL = "/api"; // Vercel rewrites handle the domain

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Cache successful GET requests
    if (response.config.method === "get") {
      import("./offlineManager").then(({ offlineManager }) => {
        offlineManager.cacheResponse(
          response.config.url,
          response.config.params,
          response.data
        );
      });
    }
    return response;
  },
  async (error) => {
    // Import offline manager dynamically to avoid circular deps if any (though unlikely here)
    const { offlineManager } = await import("./offlineManager");

    const isNetworkError =
      error.code === "ERR_NETWORK" ||
      !navigator.onLine ||
      error.message === "Network Error";

    if (isNetworkError) {
      const config = error.config;

      // Handle Mutations (POST, PUT, DELETE)
      if (["post", "put", "delete"].includes(config.method)) {
        console.log("Offline mutation detected, queueing...");
        offlineManager.addToQueue(config);
        // Return mock success
        return Promise.resolve({
          data: { _offline: true, message: "Action queued (Offline)" },
          status: 200,
          statusText: "OK (Offline)",
          headers: {},
          config: config,
        });
      }

      // Handle Queries (GET)
      if (config.method === "get") {
        console.log("Offline query detected, checking cache...");
        const cachedData = offlineManager.getCachedResponse(
          config.url,
          config.params
        );
        if (cachedData) {
          return Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: "OK (Cached)",
            headers: {},
            config: config,
          });
        }
      }
    }

    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (
        window.location.pathname !== "/login" &&
        window.location.pathname !== "/register"
      ) {
        const currentPath = encodeURIComponent(
          window.location.pathname + window.location.search
        );
        window.location.href = `/login?redirect=${currentPath}`;
      }
    }
    return Promise.reject(error);
  }
);

import("./offlineManager").then(({ offlineManager }) => {
  offlineManager.setApiClient(api);
});

export default api;
