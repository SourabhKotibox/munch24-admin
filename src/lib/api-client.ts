import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

let baseUrl = import.meta.env.VITE_API_URL || "https://flipshorts.app";
let getAuthToken = () => localStorage.getItem("appAccessToken");

export const getActiveProfileId = (): string | null => {
  try {
    const p = localStorage.getItem('ott_active_profile');
    return p ? JSON.parse(p).id || null : null;
  } catch {
    return null;
  }
};

type UploadProgress = {
  loaded: number;
  total: number;
};

type ApiOptions = RequestInit & {
  onUploadProgress?: (progress: UploadProgress) => void;
  useAdminToken?: boolean;
};

export const getImageUrl = (filePath) => {
  if (!filePath) return "";

  if (filePath.startsWith("http")) {
    // Convert legacy S3 URLs to local server paths
    const s3Match = filePath.match(/amazonaws\.com\/(.+)$/);
    if (s3Match) {
      return `${baseUrl}/${s3Match[1]}`;
    }
    return filePath;
  }

  if (filePath.startsWith("/uploads/") || filePath.startsWith("uploads/")) {
    const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
    return `${baseUrl}/${cleanPath}`;
  }

  return `${baseUrl}/${filePath}`;
};

export const setBaseUrl = (url) => {
  baseUrl = url;
};

export const setAuthTokenGetter = (getter) => {
  getAuthToken = getter;
};

const api = async (
  endpoint,
  options: ApiOptions = {}
) => {
  console.log("Calling api endpoint: ", endpoint, "with options: ", options);
  const headers: Record<string, string> = {
    ...options.headers,
  } as Record<string, string>;

  // Make sure endpoint starts with /api, add it if it doesn't
  const finalEndpoint = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  const isAppRoute =
    finalEndpoint.startsWith("/api/app/") ||
    finalEndpoint.startsWith("/app/") ||
    finalEndpoint.startsWith("/api/like/") ||
    finalEndpoint.startsWith("/api/wishlist") ||
    finalEndpoint.startsWith("/api/views/") ||
    finalEndpoint.startsWith("/api/share/") ||
    finalEndpoint.startsWith("/api/wallet/balance") ||
    finalEndpoint.startsWith("/api/wallet/topup") ||
    finalEndpoint.startsWith("/api/wallet/razorpay") ||
    finalEndpoint.startsWith("/api/wallet/unlocked-episodes") ||
    finalEndpoint.startsWith("/api/wallet/packages") === false && finalEndpoint.startsWith("/api/wallet/") || // fallback if needed, but specific ones are better
    finalEndpoint.startsWith("/api/web/") ||
    finalEndpoint.startsWith("/api/web-") ||
    finalEndpoint.startsWith("/web-") ||
    finalEndpoint.startsWith("/api/explore") ||
    finalEndpoint.startsWith("/explore") ||
    finalEndpoint.startsWith("/api/search") ||
    finalEndpoint.startsWith("/search") ||
    finalEndpoint.startsWith("/api/home") ||
    finalEndpoint.startsWith("/home");
  
  // Choose token based on route prefix, unless explicitly overridden
  const defaultTokenKey = isAppRoute ? "appAccessToken" : "adminAccessToken";
  const tokenKey = options.useAdminToken ? "adminAccessToken" : defaultTokenKey;
  
  let token = localStorage.getItem(tokenKey);
  if (!token) {
    // Fallback if the primary token is missing (useful for testing app routes in admin panel)
    token = localStorage.getItem(tokenKey === "appAccessToken" ? "adminAccessToken" : "appAccessToken");
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type to application/json if we're not sending FormData
  if (
  options.body &&
  !(options.body instanceof FormData)
) {
  headers["Content-Type"] = "application/json";
}
  const requestBody = options.body;
  // If we have FormData and onUploadProgress, use XMLHttpRequest for progress tracking
  if (options.body instanceof FormData && options.onUploadProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(options.method || "POST", `${baseUrl}${finalEndpoint}`);
      
      // Set headers (except Content-Type for FormData)
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          options.onUploadProgress?.({
            loaded: event.loaded,
            total: event.total,
          });
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || "API request failed"));
          }
        } catch (e) {
          reject(new Error("Failed to parse response"));
        }
      });

      xhr.addEventListener("error", () => reject(new Error("Network error")));
      xhr.addEventListener("abort", () => reject(new Error("Request aborted")));

      xhr.send(requestBody as XMLHttpRequestBodyInit);
    });
  }

  // For FormData requests, remove Content-Type header to let browser set it with boundary
  const fetchHeaders = { ...headers };
  if (options.body instanceof FormData) {
    delete fetchHeaders["Content-Type"];
  }

  const fullUrl = `${baseUrl}${finalEndpoint}`;
  console.log("Calling fetch to: ", fullUrl, "with headers: ", fetchHeaders);
  const res = await fetch(fullUrl, {
    ...options,
    headers: fetchHeaders,
  });
  console.log("Got response from fetch: ", res);

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error("Error in fetch response: ", res, errorData);
    // Token expired or invalid — clear session and redirect to home (login modal)
    if (res.status === 401) {
      const msg = (errorData.message || errorData.error || "").toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid signature") || msg.includes("no authorization") || msg.includes("jwt")) {
        if (isAppRoute) {
          // Clear all app session keys (both streaming-home and public-auth variants)
          localStorage.removeItem("appAccessToken");
          localStorage.removeItem("appUser");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          window.location.href = "/";
        } else {
          localStorage.removeItem("adminAccessToken");
          localStorage.removeItem("adminRefreshToken");
          window.location.href = "/admin/login";
        }
        return;
      }
    }
    throw new Error(errorData.message || errorData.error || "API request failed");
  }

  return res.json();
};

// Auth
export const login = async (email, password) => {
  return api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("adminRefreshToken");
  return api("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
};

export const deleteAccount = async () => {
  return api("/api/auth/account", {
    method: "DELETE",
  });
};

export const getMe = async () => {
  try {
    const response = await api("/api/auth/me", {
      method: "GET",
    });
    return response.user;
  } catch (error: any) {
    console.error("getMe error:", error);
    // If it's a 401 Unauthorized, return null
    if (error.message?.includes("Unauthorized") || error.message?.includes("401")) {
      return null;
    }
    throw error;
  }
};

// Users
export const getUsersList = async (options) => {
  const params = new URLSearchParams();
  if (options?.search) params.set("search", options.search);
  if (options?.plan) params.set("plan", options.plan);
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  return api(`/api/users?${params.toString()}`);
};

export const getUserById = async (id) => {
  return api(`/api/users/${id}`);
};

export const updateUser = async (id, data) => {
  return api(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const banUser = async (id, reason) => {
  return api(`/api/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
};

export const unbanUser = async (id) => {
  return api(`/api/users/${id}/unban`, { method: "POST" });
};

export const deleteUser = async (id) => {
  return api(`/api/users/${id}`, { method: "DELETE" });
};

// Hooks
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ email, password }) =>
      login(email, password),
    onSuccess: (data) => {
      localStorage.setItem("adminAccessToken", data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem("adminRefreshToken", data.refreshToken);
      }
      queryClient.clear();
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: () => logout(),
    onSuccess: () => {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
      queryClient.clear();
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      localStorage.removeItem("appAccessToken");
      localStorage.removeItem("refreshToken");
      queryClient.clear();
    },
  });
};

export const useGetMe = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("adminAccessToken") : null;
  return useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: !!token,
    retry: 1,
  });
};

export const useGetUsersList = (options) => {
  return useQuery({
    queryKey: ["users-list", options],
    queryFn: () => getUsersList(options),
  });
};

export const useGetUserById = (id) => {
  return useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const result = await getUserById(id);
      return result.data;
    },
    enabled: !!id,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useBanUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, reason }) =>
      banUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useUnbanUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: unbanUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
    },
  });
};

// Languages
export const getLanguagesList = async () => {
  return api("/languages");
};

export const getLanguageById = async (id) => {
  return api(`/languages/${id}`);
};

export const createLanguage = async (formData, options) => {
  return api("/languages", {
    method: "POST",
    body: formData,
    ...options,
  });
};

export const updateLanguage = async (id, formData, options) => {
  return api(`/languages/${id}`, {
    method: "PUT",
    body: formData,
    ...options,
  });
};

export const deleteLanguage = async (id) => {
  return api(`/languages/${id}`, { method: "DELETE" });
};

// Hooks
export const useGetLanguagesList = () => {
  return useQuery({
    queryKey: ["languages-list"],
    queryFn: () => getLanguagesList(),
  });
};

export const useGetLanguageById = (id) => {
  return useQuery({
    queryKey: ["language", id],
    queryFn: () => getLanguageById(id),
    enabled: !!id,
  });
};

export const useCreateLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ data, onUploadProgress }) => 
      createLanguage(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages-list"] });
    },
  });
};

export const useUpdateLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data, onUploadProgress }) => 
      updateLanguage(id, data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages-list"] });
    },
  });
};

export const useDeleteLanguage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteLanguage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["languages-list"] });
    },
  });
};

// Promotions
export const getPromotionsList = async (options) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/promotions?${params.toString()}`);
};

export const getActivePromotion = async () => {
  return api("/promotions/active");
};

export const getPromotionById = async (id) => {
  return api(`/promotions/${id}`);
};

export const createPromotion = async (data, options) => {
  return api("/promotions", {
    method: "POST",
    body: data,
    ...options,
  });
};

export const updatePromotion = async (id, data, options) => {
  return api(`/promotions/${id}`, {
    method: "PUT",
    body: data,
    ...options,
  });
};

export const deletePromotion = async (id) => {
  return api(`/promotions/${id}`, { method: "DELETE" });
};

export const bulkDeletePromotions = async (ids) => {
  return api('/promotions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

// Hooks
export const useGetPromotionsList = (options) => {
  return useQuery({
    queryKey: ["promotions-list", options],
    queryFn: () => getPromotionsList(options),
  });
};

export const useGetActivePromotion = () => {
  return useQuery({
    queryKey: ["promotion-active"],
    queryFn: getActivePromotion,
  });
};

export const useGetPromotionById = (id) => {
  return useQuery({
    queryKey: ["promotion", id],
    queryFn: async () => {
      const result = await getPromotionById(id);
      return result.data;
    },
    enabled: !!id,
  });
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ data, onUploadProgress }) => 
      createPromotion(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions-list"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-active"] });
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data, onUploadProgress }) => 
      updatePromotion(id, data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions-list"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-active"] });
    },
  });
};

export const useDeletePromotion = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions-list"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-active"] });
    },
  });
};

export const useBulkDeletePromotions = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeletePromotions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions-list"] });
      queryClient.invalidateQueries({ queryKey: ["promotion-active"] });
    },
  });
};

// Home Page
export const getHomePage = async (options) => {
  const params = new URLSearchParams();
  if (options?.platform) params.set("platform", options.platform);
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/home?${params.toString()}`);
};

// Banner Shows
export const getBannersList = async (options) => {
  const params = new URLSearchParams();
  if (options?.admin) params.set("admin", "true");
  if (options?.platform) params.set("platform", options.platform);
  return api(`/banners?${params.toString()}`);
};

export const getBannerById = async (bannerId) => {
  return api(`/banners/item/${bannerId}`);
};

export const getBannerShowByContentId = async (
  contentId,
  options
) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/banners/${contentId}?${params.toString()}`);
};

export const createBannerShow = async (
  data,
  options
) => {
  return api("/banners", {
    method: "POST",
    body: data,
    ...options,
  });
};

export const updateBanner = async (
  bannerId,
  data,
  options
) => {
  return api(`/banners/item/${bannerId}`, {
    method: "PUT",
    body: data,
    ...options,
  });
};

export const deleteBanner = async (bannerId) => {
  return api(`/banners/item/${bannerId}`, { method: "DELETE" });
};

export const bulkDeleteBanners = async (ids) => {
  return api("/banners/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
    headers: { "Content-Type": "application/json" },
  });
};

export const createBannerFromContent = async (data: {
  contentId: string;
  contentSource: "movie" | "content";
  title?: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  position?: number;
  isActive?: boolean;
}) => {
  return api("/banners/from-content", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

export const appendBannerShowVideo = async (
  contentId,
  data,
  options
) => {
  return api(`/banners/${contentId}/videos`, {
    method: "POST",
    body: data,
    ...options,
  });
};

export const updateEpisodeLock = async (episodeId, isLocked) => {
  return api(`/episodes/${episodeId}/lock`, {
    method: "PATCH",
    body: JSON.stringify({ isLocked }),
  });
};

export const useGetBannersList = (options) => {
  return useQuery({
    queryKey: ["banners-list", options],
    queryFn: () => getBannersList(options),
  });
};

export const useGetBannerById = (bannerId) => {
  return useQuery({
    queryKey: ["banner", bannerId],
    queryFn: async () => {
      const result = await getBannerById(bannerId);
      return result.data;
    },
    enabled: !!bannerId,
  });
};

export const useGetBannerShowByContentId = (
  contentId,
  options = {}
) => {
  return useQuery({
    queryKey: ["banner-show", contentId, options],
    queryFn: async () => {
      const result = await getBannerShowByContentId(contentId, options);
      return result.data;
    },
    enabled: !!contentId,
  });
};

export const useCreateBannerShow = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({
      data,
      onUploadProgress,
    }) => createBannerShow(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
    },
  });
};

export const useCreateBannerFromContent = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data) => createBannerFromContent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
    },
  });
};

export const useUpdateBanner = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({
      bannerId,
      data,
      onUploadProgress,
    }) => updateBanner(bannerId, data, { onUploadProgress }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      queryClient.invalidateQueries({ queryKey: ["banner", variables.bannerId] });
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
    },
  });
};

export const useDeleteBanner = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
    },
  });
};

export const useBulkDeleteBanners = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: bulkDeleteBanners,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
    },
  });
};

export const useAppendBannerShowVideo = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({
      contentId,
      data,
      onUploadProgress,
    }) => appendBannerShowVideo(contentId, data, { onUploadProgress }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["banners-list"] });
      queryClient.invalidateQueries({ queryKey: ["banner-show", variables.contentId] });
    },
  });
};

export const useGetHomePage = (options) => {
  return useQuery({
    queryKey: ["home-page", options],
    queryFn: () => getHomePage(options),
  });
};

export const getWebHome = async () => {
  return api(`/web-home`);
};

export const useGetWebHome = () => {
  return useQuery({
    queryKey: ["web-home"],
    queryFn: async () => {
      const res = await getWebHome();
      return res.data;
    },
  });
};

export const getWebAllContent = async () => {
  return api(`/web-all-content`);
};

export const useGetWebAllContent = () => {
  return useQuery({
    queryKey: ["web-all-content"],
    queryFn: async () => {
      const res = await getWebAllContent();
      return res.data;
    },
  });
};

export const getWebBrowse = async (options: { type: string, genre?: string, page?: number, search?: string, limit?: number, section?: string }) => {
  const params = new URLSearchParams();
  if (options.type) params.set("type", options.type);
  if (options.genre && options.genre !== "All") params.set("genre", options.genre);
  if (options.page) params.set("page", options.page.toString());
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", options.limit.toString());
  if (options.section) params.set("section", options.section);
  return api(`/web-browse?${params.toString()}`);
};

export const useGetWebBrowse = (options: { type: string, genre?: string, page?: number, search?: string, limit?: number, section?: string }, enabled = true) => {
  return useQuery({
    queryKey: ["web-browse", options],
    queryFn: async () => {
      const res = await getWebBrowse(options);
      return res.data;
    },
    enabled,
  });
};

export const getWebDetail = async (contentId: string) => {
  return api(`/web-detail/${contentId}`);
};

export const useGetWebDetail = (contentId: string) => {
  return useQuery({
    queryKey: ["web-detail", contentId],
    queryFn: async () => {
      if (!contentId) throw new Error("Missing contentId");
      const res = await getWebDetail(contentId);
      return res.data;
    },
    enabled: !!contentId,
  });
};

export const useUpdateEpisodeLock = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ episodeId, isLocked }) =>
      updateEpisodeLock(episodeId, isLocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
    },
  });
};

// Categories
export const getCategoriesList = async (options) => {
  const params = new URLSearchParams();
  if (options?.admin) params.set("admin", "true");
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/categories?${params.toString()}`);
};

export const getCategoriesWithContent = async () => {
  return api("/categories/with-content");
};

export const getCategoryById = async (categoryId) => {
  return api(`/categories/item/${categoryId}`);
};

export const getCategoryContents = async (categoryId, options) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/categories/${categoryId}/contents?${params.toString()}`);
};

export const createCategory = async (data, options = {}) => {
  return api("/categories", {
    method: "POST",
    body: data,
    ...options,
  });
};

export const updateCategory = async (categoryId, data, options = {}) => {
  return api(`/categories/item/${categoryId}`, {
    method: "PUT",
    body: data,
    ...options,
  });
};

export const deleteCategory = async (categoryId) => {
  return api(`/categories/item/${categoryId}`, { method: "DELETE" });
};

export const bulkDeleteCategories = async (ids) => {
  return api("/categories/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
    headers: { "Content-Type": "application/json" },
  });
};

export const addContentToCategory = async (categoryId, contentId) => {
  return api(`/categories/${categoryId}/contents/${contentId}`, { method: "POST" });
};

export const removeContentFromCategory = async (categoryId, contentId) => {
  return api(`/categories/${categoryId}/contents/${contentId}`, { method: "DELETE" });
};

// Hooks
export const useGetCategoriesList = (options = {}) => {
  return useQuery({
    queryKey: ["categories-list", options],
    queryFn: () => getCategoriesList(options),
  });
};

export const useGetCategoriesWithContent = () => {
  return useQuery({
    queryKey: ["categories-with-content"],
    queryFn: getCategoriesWithContent,
  });
};

export const useGetCategoryById = (categoryId) => {
  return useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      const result = await getCategoryById(categoryId);
      return result.data;
    },
    enabled: !!categoryId,
  });
};

export const useGetCategoryContents = (categoryId, options = {}) => {
  return useQuery({
    queryKey: ["category-contents", categoryId, options],
    queryFn: () => getCategoryContents(categoryId, options),
    enabled: !!categoryId,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ data }) =>
      createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ categoryId, data }) =>
      updateCategory(categoryId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["category", variables.categoryId] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
    },
  });
};

export const useBulkDeleteCategories = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: bulkDeleteCategories,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
    },
  });
};

export const useAddContentToCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ categoryId, contentId }) =>
      addContentToCategory(categoryId, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

export const useRemoveContentFromCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ categoryId, contentId }) =>
      removeContentFromCategory(categoryId, contentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

// Notification Templates
export const getNotificationTemplates = async () => {
  return api("/notification-templates");
};

export const getNotificationTemplateById = async (templateId: string) => {
  return api(`/notification-templates/item/${templateId}`);
};

export const createNotificationTemplate = async (data: any, options?: ApiOptions) => {
  return api("/notification-templates", {
    method: "POST",
    body: JSON.stringify(data),
    ...options,
  });
};

export const updateNotificationTemplate = async (templateId: string, data: any, options?: ApiOptions) => {
  return api(`/notification-templates/item/${templateId}`, {
    method: "PUT",
    body: JSON.stringify(data),
    ...options,
  });
};

export const toggleNotificationTemplateStatus = async (templateId: string) => {
  return api(`/notification-templates/item/${templateId}/toggle-status`, {
    method: "PATCH",
  });
};

export const deleteNotificationTemplate = async (templateId: string) => {
  return api(`/notification-templates/item/${templateId}`, {
    method: "DELETE",
  });
};

export const useGetNotificationTemplates = () => {
  return useQuery({
    queryKey: ["notification-templates"],
    queryFn: getNotificationTemplates,
  });
};

export const useGetNotificationTemplateById = (templateId?: string) => {
  return useQuery({
    queryKey: ["notification-template", templateId],
    queryFn: () => getNotificationTemplateById(templateId!),
    enabled: !!templateId,
  });
};

export const useCreateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { data: any }>({
    mutationFn: ({ data }) => createNotificationTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
  });
};

export const useUpdateNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { templateId: string; data: any }>({
    mutationFn: ({ templateId, data }) => updateNotificationTemplate(templateId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      queryClient.invalidateQueries({ queryKey: ["notification-template", variables.templateId] });
    },
  });
};

export const useToggleNotificationTemplateStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (templateId) => toggleNotificationTemplateStatus(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
  });
};

export const useDeleteNotificationTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (templateId) => deleteNotificationTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
    },
  });
};

// Category Shows
export const createCategoryShow = async (data, options) => {
  return api("/categories/show", {
    method: "POST",
    body: data,
    ...options,
  });
};

export const appendCategoryShowVideo = async (
  contentId,
  data,
  options
) => {
  return api(`/categories/${contentId}/videos`, {
    method: "POST",
    body: data,
    ...options,
  });
};

export const getCategoryShowByContentId = async (
  contentId,
  options
) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  return api(`/categories/${contentId}?${params.toString()}`);
};

export const updateCategoryEpisodeLock = async (episodeId, isLocked) => {
  return api(`/categories/episodes/${episodeId}/lock`, {
    method: "PUT",
    body: JSON.stringify({ isLocked }),
  });
};

// Hooks
export const useCreateCategoryShow = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ data, onUploadProgress }) =>
      createCategoryShow(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

export const useAppendCategoryShowVideo = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({
      contentId,
      data,
      onUploadProgress,
    }) => appendCategoryShowVideo(contentId, data, { onUploadProgress }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
      queryClient.invalidateQueries({
        queryKey: ["category-show", variables.contentId],
      });
    },
  });
};

export const useGetCategoryShowByContentId = (
  contentId,
  options = {}
) => {
  return useQuery({
    queryKey: ["category-show", contentId, options],
    queryFn: async () => {
      const result = await getCategoryShowByContentId(contentId, options);
      return result.data;
    },
    enabled: !!contentId,
  });
};

export const useUpdateCategoryEpisodeLock = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ episodeId, isLocked }) =>
      updateCategoryEpisodeLock(episodeId, isLocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-show"] });
      queryClient.invalidateQueries({ queryKey: ["banner-show"] });
    },
  });
};

// Content / Shows
export const getContentList = async (options?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  contentType?: string;
  status?: string;
  isNewContent?: boolean;
  featured?: string;
  trending?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.search) params.set("search", options.search);
  if (options?.type) params.set("type", options.type);
  if (options?.contentType) params.set("contentType", options.contentType);
  if (options?.status) params.set("status", options.status);
  if (options?.isNewContent !== undefined) params.set("isNewContent", options.isNewContent.toString());
  if (options?.featured) params.set("featured", options.featured);
  if (options?.trending) params.set("trending", options.trending);
  return api(`/contents?${params.toString()}`);
};

export const createContent = async (data, options) => {
  return api("/contents", {
    method: "POST",
    body: data,
    ...options,
  });
};

export const getContentById = async (id) => {
  return api(`/contents/${id}`);
};

export const appendContentVideo = async (contentId, data, options) => {
  return api(`/contents/${contentId}/videos`, {
    method: "POST",
    body: data,
    ...options,
  });
};

export const updateContentEpisodeLock = async (episodeId, isLocked) => {
  return api(`/episodes/${episodeId}/lock`, {
    method: "PATCH",
    body: JSON.stringify({ isLocked }),
  });
};

export const updateContent = async (id, data) => {
  return api(`/contents/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

export const deleteContent = async (id) => {
  return api(`/contents/${id}`, { method: "DELETE" });
};

// Hooks
export const useGetContentList = (options?: Parameters<typeof getContentList>[0]) => {
  return useQuery({
    queryKey: ["content-list", options],
    queryFn: () => getContentList(options),
  });
};

export const useGetContentById = (id) => {
  return useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const result = await getContentById(id);
      return result.data;
    },
    enabled: !!id,
  });
};

export const useCreateContent = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ data, onUploadProgress }) =>
      createContent(data, { onUploadProgress }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

export const useAppendContentVideo = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({
      contentId,
      data,
      onUploadProgress,
    }) => appendContentVideo(contentId, data, { onUploadProgress }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      queryClient.invalidateQueries({ queryKey: ["content", variables.contentId] });
    },
  });
};

export const useUpdateContentEpisodeLock = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ episodeId, isLocked }) =>
      updateContentEpisodeLock(episodeId, isLocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
};

export const useUpdateContent = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }) => updateContent(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      queryClient.invalidateQueries({ queryKey: ["contents"] });
      queryClient.invalidateQueries({ queryKey: ["content", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

export const useDeleteContent = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-list"] });
      queryClient.invalidateQueries({ queryKey: ["categories-with-content"] });
    },
  });
};

// Episodes API
export const getEpisodeList = async (options: any = {}) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.contentId) params.set("contentId", options.contentId);
  if (options?.season) params.set("season", options.season.toString());
  if (options?.contentType) params.set("contentType", options.contentType);
  if (options?.search) params.set("search", options.search);
  return api(`/episodes?${params.toString()}`);
};

export const getSeasonList = async (options: any = {}) => {
  const params = new URLSearchParams();
  if (options?.contentType) params.set("contentType", options.contentType);
  if (options?.contentId) params.set("contentId", options.contentId);
  return api(`/episodes/seasons?${params.toString()}`);
};

export const getEpisodeById = async (id: string) => {
  return api(`/episodes/${id}`);
};

export const createEpisode = async (data: any) => {
  return api("/episodes", {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

export const updateEpisode = async (id: string, data: any) => {
  return api(`/episodes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });
};

export const deleteEpisode = async (id: string) => {
  return api(`/episodes/${id}`, { method: "DELETE" });
};

export const toggleEpisodeLock = async (id: string, isLocked: boolean) => {
  return api(`/episodes/${id}/lock`, {
    method: "PATCH",
    body: JSON.stringify({ isLocked }),
    headers: { "Content-Type": "application/json" },
  });
};

export const useGetEpisodeList = (options: any) => {
  return useQuery({
    queryKey: ["episode-list", options],
    queryFn: () => getEpisodeList(options),
  });
};

export const useGetSeasonList = (options: any) => {
  return useQuery({
    queryKey: ["season-list", options],
    queryFn: () => getSeasonList(options),
  });
};

export const useGetEpisodeById = (id: string) => {
  return useQuery({
    queryKey: ["episode", id],
    queryFn: async () => {
      const result = await getEpisodeById(id);
      return result.data;
    },
    enabled: !!id,
  });
};

export const useCreateEpisode = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data: any) => createEpisode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["season-list"] });
    },
  });
};

export const useUpdateEpisode = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateEpisode(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["episode", variables.id] });
    },
  });
};

export const useDeleteEpisode = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (id: string) => deleteEpisode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
      queryClient.invalidateQueries({ queryKey: ["season-list"] });
    },
  });
};

export const useToggleEpisodeLock = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, isLocked }: { id: string; isLocked: boolean }) =>
      toggleEpisodeLock(id, isLocked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["episode-list"] });
    },
  });
};

// Pages API
export const getPages = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/pages?${params.toString()}`);
};

export const getPageBySlug = async (slug: string) => {
  return api(`/pages/${slug}`);
};

export const getPageById = async (id: string) => {
  return api(`/pages/item/${id}`);
};

export const createPage = async (data: any) => {
  return api('/pages', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const updatePage = async (id: string, data: any) => {
  return api(`/pages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const deletePage = async (id: string) => {
  return api(`/pages/${id}`, { method: 'DELETE' });
};

export const bulkDeletePages = async (ids: string[]) => {
  return api('/pages/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const useGetPages = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({
    queryKey: ['pages', options],
    queryFn: () => getPages(options)
  });
};

export const useGetPageBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['page', slug],
    queryFn: () => getPageBySlug(slug)
  });
};

export const useGetPageById = (id: string) => {
  return useQuery({
    queryKey: ['page-detail', id],
    queryFn: async () => {
      const res = await getPageById(id);
      return res.data;
    },
    enabled: !!id && id !== 'new',
  });
};

export const useCreatePage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createPage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
};

export const useUpdatePage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updatePage(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
};

export const useDeletePage = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deletePage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
};

export const useBulkDeletePages = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: bulkDeletePages,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
    }
  });
};

// Ads API
export const getAds = async (options?: any) => {
  const params = new URLSearchParams();
  if (options?.adType) params.set('adType', options.adType);
  if (options?.placement) params.set('placement', options.placement);
  if (options?.status) params.set('status', options.status);
  return api(`/ads?${params.toString()}`);
};

export const createAd = async (data: any) => {
  return api('/ads', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const updateAd = async (id: string, data: any) => {
  return api(`/ads/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const deleteAd = async (id: string) => {
  return api(`/ads/${id}`, { method: 'DELETE' });
};

export const bulkDeleteAds = async (ids: string[]) => {
  return api('/ads/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    headers: { 'Content-Type': 'application/json' }
  });
};

export const useGetAds = (options?: any) => {
  return useQuery({
    queryKey: ['ads', options],
    queryFn: () => getAds(options)
  });
};

export const getPublicAds = async (options?: { placement?: string; targetContentType?: string }) => {
  const params = new URLSearchParams();
  if (options?.placement) params.set('placement', options.placement);
  if (options?.targetContentType) params.set('targetContentType', options.targetContentType);
  return api(`/public/ads?${params.toString()}`);
};

export const useGetPublicAds = (options?: { placement?: string; targetContentType?: string }) => {
  return useQuery({
    queryKey: ['public-ads', options],
    queryFn: () => getPublicAds(options),
    staleTime: 5 * 60 * 1000,
  });
};

export const getPublicNotifications = async () => api('/public/notifications');

export const useGetPublicNotifications = () => {
  return useQuery({
    queryKey: ['public-notifications'],
    queryFn: getPublicNotifications,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
};

export const useCreateAd = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    }
  });
};

export const useUpdateAd = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateAd(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    }
  });
};

export const useDeleteAd = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteAd,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    }
  });
};

export const useBulkDeleteAds = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteAds,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads'] });
    }
  });
};

export const getAdAnalytics = async () => api('/ads/analytics');

export const useGetAdAnalytics = () => {
  return useQuery({
    queryKey: ['ad-analytics'],
    queryFn: getAdAnalytics,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
};

export const recordAdInteraction = async (id: string, action: 'click' | 'impression') => {
  return api(`/app/ads/${id}/interaction`, {
    method: 'POST',
    body: JSON.stringify({ action }),
    headers: { 'Content-Type': 'application/json' },
  });
};



// Settings
export const getSettings = async () => {
  const response = await api("/settings");
  return response.data;
};

export const updateSettingsData = async (data: Record<string, any>) => {
  const response = await api("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return response.data;
};

export const uploadSettingsLogos = async (formData: FormData) => {
  const response = await api("/settings/upload-logos", {
    method: "POST",
    body: formData,
  });
  return response.data;
};

export const useGetSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Record<string, any>>({
    mutationFn: (data) => updateSettingsData(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};

export const useUploadSettingsLogos = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, FormData>({
    mutationFn: (formData) => uploadSettingsLogos(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};

// Email Diagnostics
export const getEmailStatus = async () => {
  return api("/settings/email-status");
};

export const testEmail = async (to: string) => {
  return api("/settings/test-email", {
    method: "POST",
    body: JSON.stringify({ to }),
  });
};

export const useGetEmailStatus = () => {
  return useQuery({
    queryKey: ["email-status"],
    queryFn: getEmailStatus,
    retry: 1,
  });
};

export const useTestEmail = () => {
  return useMutation<any, Error, string>({
    mutationFn: (to) => testEmail(to),
  });
};

// Genres
export const getGenres = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.admin) params.append('admin', 'true');
  return api(`/genres?${params.toString()}`);
};

export const getGenreById = async (id: string) => {
  return api(`/genres/item/${id}`);
};

export const createGenre = async (formData: FormData) => {
  return api('/genres', {
    method: 'POST',
    body: formData,
  });
};

export const updateGenre = async (id: string, formData: FormData) => {
  return api(`/genres/item/${id}`, {
    method: 'PUT',
    body: formData,
  });
};

export const deleteGenre = async (id: string) => {
  return api(`/genres/item/${id}`, { method: 'DELETE' });
};

export const bulkDeleteGenres = async (ids: string[]) => {
  return api('/genres/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetGenres = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({
    queryKey: ['genres', options],
    queryFn: () => getGenres(options)
  });
};

export const useGetGenreById = (id: string) => {
  return useQuery({
    queryKey: ['genre', id],
    queryFn: () => getGenreById(id),
    enabled: !!id
  });
};

export const useCreateGenre = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    }
  });
};

export const useUpdateGenre = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateGenre(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    }
  });
};

export const useDeleteGenre = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    }
  });
};

export const useBulkDeleteGenres = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteGenres,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
    }
  });
};

// Subscription Plans API
export const getSubscriptionPlans = async (options?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  return api(`/subscription-plans?${params.toString()}`);
};

export const getSubscriptionPlanById = async (id: string) => {
  return api(`/subscription-plans/${id}`);
};

export const createSubscriptionPlan = async (data: any) => {
  return api('/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateSubscriptionPlan = async (id: string, data: any) => {
  return api(`/subscription-plans/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// Media Library API
export const getMediaFolders = async (parentFolder?: string) => {
  const query = parentFolder ? `?parentFolder=${parentFolder}` : '';
  return api(`/media/folders${query}`);
};

export const createMediaFolder = async (name: string, parentFolder?: string) => {
  return api('/media/folders', {
    method: 'POST',
    body: JSON.stringify({ name, parentFolder }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const deleteMediaFolder = async (folderId: string) => {
  return api(`/media/folders/${folderId}`, { method: 'DELETE' });
};

export const getMediaFilesByFolder = async (folderId: string) => {
  return api(`/media/folders/${folderId}/files`);
};

export const uploadMediaFiles = async (folderId: string, files: File[], source?: string) => {
  const formData = new FormData();
  files.forEach(file => formData.append('file', file));
  if (source) formData.append('source', source);
  return api(`/media/folders/${folderId}/files`, {
    method: 'POST',
    body: formData,
  });
};

export const deleteMediaFile = async (fileId: string) => {
  return api(`/media/files/${fileId}`, { method: 'DELETE' });
};

export const getAllMediaFiles = async (options?: {
  page?: number;
  limit?: number;
  source?: string;
  fileType?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.source) params.set('source', options.source);
  if (options?.fileType) params.set('fileType', options.fileType);
  if (options?.search) params.set('search', options.search);
  return api(`/media/files/all?${params.toString()}`);
};

// Sections API
export const getSections = async (params?: { contentType?: string; activeOnly?: boolean; platform?: string }) => {
  const query = new URLSearchParams();
  if (params?.contentType) query.append('contentType', params.contentType);
  if (params?.activeOnly) query.append('activeOnly', 'true');
  if (params?.platform) query.append('platform', params.platform);
  return api(`/sections?${query.toString()}`);
};

export const getSectionById = async (id: string) => {
  return api(`/sections/${id}`);
};

export const createSection = async (data: any) => {
  return api('/sections', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const updateSection = async (id: string, data: any) => {
  return api(`/sections/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const deleteSection = async (id: string) => {
  return api(`/sections/${id}`, { method: 'DELETE' });
};

export const reorderSections = async (updates: { id: string, position: number }[]) => {
  return api('/sections/reorder', {
    method: 'PUT',
    body: JSON.stringify({ updates }),
    headers: { 'Content-Type': 'application/json' },
  });
};

// Sections Hooks
export const useGetSections = (params?: { contentType?: string; activeOnly?: boolean; platform?: string }) => {
  return useQuery({
    queryKey: ['sections', params],
    queryFn: () => getSections(params),
  });
};

export const useGetSection = (id: string) => {
  return useQuery({
    queryKey: ['sections', id],
    queryFn: () => getSectionById(id),
    enabled: !!id,
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

export const useUpdateSection = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: deleteSection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

export const useReorderSections = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string, position: number }[]>({
    mutationFn: reorderSections,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
  });
};

// App Settings API
export const getAppSettings = async () => {
  return api('/app-settings');
};

export const getHomeTabsConfig = async () => {
  return api('/app-settings/home-tabs');
};

export const updateHomeTabsConfig = async (tabs: { id: string; name: string }[]) => {
  return api('/app-settings/home-tabs', {
    method: 'PUT',
    body: JSON.stringify({ tabs }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const useGetHomeTabsConfig = () => {
  return useQuery({
    queryKey: ['homeTabsConfig'],
    queryFn: getHomeTabsConfig,
  });
};

export const useUpdateHomeTabsConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateHomeTabsConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homeTabsConfig'] });
    },
  });
};


export const updateAppSettings = async (settings: any[]) => {
  return api('/app-settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const addAppSetting = async (name: string, type: 'simple' | 'select') => {
  return api('/app-settings', {
    method: 'POST',
    body: JSON.stringify({ name, type }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const deleteAppSetting = async (id: string) => {
  return api(`/app-settings/${id}`, { method: 'DELETE' });
};

export const editAppSetting = async (id: string, updates: { name?: string; type?: 'simple' | 'select' }) => {
  return api(`/app-settings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: { 'Content-Type': 'application/json' },
  });
};

// App Settings Hooks
export const useGetAppSettings = () => {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: () => getAppSettings(),
  });
};

export const useUpdateAppSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: any[]) => updateAppSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
};

export const useAddAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, type }: { name: string; type: 'simple' | 'select' }) =>
      addAppSetting(name, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
};

export const useDeleteAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAppSetting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
};

export const useEditAppSetting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; type?: 'simple' | 'select' } }) =>
      editAppSetting(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
};

// Media Library Hooks
export const useGetMediaFolders = (parentFolder?: string) => {
  return useQuery({
    queryKey: ['media-folders', parentFolder],
    queryFn: () => getMediaFolders(parentFolder),
  });
};

export const useCreateMediaFolder = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { name: string; parentFolder?: string }>({
    mutationFn: ({ name, parentFolder }) => createMediaFolder(name, parentFolder),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['media-folders', variables.parentFolder] });
    },
  });
};

export const useDeleteMediaFolder = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (folderId) => deleteMediaFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
    },
  });
};

export const useGetMediaFilesByFolder = (folderId?: string) => {
  return useQuery({
    queryKey: ['media-files', folderId],
    queryFn: () => folderId ? getMediaFilesByFolder(folderId) : Promise.resolve(),
    enabled: !!folderId,
  });
};

export const useUploadMediaFiles = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { folderId: string; files: File[]; source?: string }>({
    mutationFn: ({ folderId, files, source }) => uploadMediaFiles(folderId, files, source),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['media-files', variables.folderId] });
      queryClient.invalidateQueries({ queryKey: ['all-media-files'] });
    },
  });
};

export const useDeleteMediaFile = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: (fileId) => deleteMediaFile(fileId),
    onSuccess: (_, __, context) => {
      queryClient.invalidateQueries({ queryKey: ['media-files'] });
      queryClient.invalidateQueries({ queryKey: ['all-media-files'] });
    },
  });
};

export const useGetAllMediaFiles = (options?: {
  page?: number;
  limit?: number;
  source?: string;
  fileType?: string;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['all-media-files', options],
    queryFn: () => getAllMediaFiles(options),
    enabled: true,
  });
};

export const deleteSubscriptionPlan = async (id: string) => {
  return api(`/subscription-plans/${id}`, { method: 'DELETE' });
};

export const bulkDeleteSubscriptionPlans = async (ids: string[]) => {
  return api('/subscription-plans/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetSubscriptionPlans = (options?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['subscriptionPlans', options],
    queryFn: () => getSubscriptionPlans(options)
  });
};

export const useGetSubscriptionPlanById = (id: string) => {
  return useQuery({
    queryKey: ['subscriptionPlan', id],
    queryFn: () => getSubscriptionPlanById(id),
    enabled: !!id
  });
};

// Public web endpoint — no admin auth required, returns only active plans
export const useGetWebSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['webSubscriptionPlans'],
    queryFn: () => api('/web/subscription-plans'),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
    }
  });
};

export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateSubscriptionPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
    }
  });
};

export const useDeleteSubscriptionPlan = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteSubscriptionPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
    }
  });
};

// Movies API
export const getMovies = async (options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  genre?: string;
  category?: string;
  language?: string;
  featured?: string;
  trending?: string;
  year?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.search) params.append('search', options.search);
  if (options?.status) params.append('status', options.status);
  if (options?.genre) params.append('genre', options.genre);
  if (options?.category) params.append('category', options.category);
  if (options?.language) params.append('language', options.language);
  if (options?.featured) params.append('featured', options.featured);
  if (options?.trending) params.append('trending', options.trending);
  if (options?.year) params.append('year', options.year);

  return api(`/movies?${params.toString()}`);
};

export const getMovieById = async (id: string) => {
  return api(`/movies/${id}`);
};

export const createMovie = async (data: any) => {
  return api('/movies', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateMovie = async (id: string, data: any) => {
  return api(`/movies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteMovie = async (id: string) => {
  return api(`/movies/${id}`, { method: 'DELETE' });
};

export const updateMovieStatus = async (id: string, data: { status: string; rejectionReason?: string }) => {
  return api(`/movies/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const toggleMovieFeatured = async (id: string) => {
  return api(`/movies/${id}/featured`, { method: 'PATCH' });
};

export const toggleMovieTrending = async (id: string) => {
  return api(`/movies/${id}/trending`, { method: 'PATCH' });
};

export const getMovieProcessingStatus = async (id: string) => {
  return api(`/movies/${id}/processing-status`);
};

/**
 * Poll movie HLS processing status every 5 seconds.
 * Polling stops automatically once status is 'ready' or 'failed'.
 */
export const useMovieProcessingStatus = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ['movie-processing-status', id],
    queryFn: () => getMovieProcessingStatus(id),
    enabled: !!id && enabled,
    refetchInterval: (data: any) => {
      const status = data?.data?.processingStatus;
      if (status === 'ready' || status === 'failed') return false;
      return 5000; // poll every 5 seconds while processing
    },
    refetchIntervalInBackground: false,
  });
};

export const useGetMovies = (options?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  genre?: string;
  category?: string;
  language?: string;
  featured?: string;
  trending?: string;
  year?: string;
}) => {
  return useQuery({
    queryKey: ['movies', options],
    queryFn: () => getMovies(options),
  });
};

export const useGetMovieById = (id: string) => {
  return useQuery({
    queryKey: ['movie', id],
    queryFn: () => getMovieById(id),
    enabled: !!id,
  });
};

export const useCreateMovie = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const useUpdateMovie = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => updateMovie(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie', variables.id] });
    },
  });
};

export const useDeleteMovie = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: deleteMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const useUpdateMovieStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; data: { status: string; rejectionReason?: string } }>({
    mutationFn: ({ id, data }) => updateMovieStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const useToggleMovieFeatured = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: toggleMovieFeatured,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const getPendingApprovals = async (options?: { page?: number; limit?: number; type?: string }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.type) params.append('type', options.type);
  return api(`/movies/pending-approvals?${params.toString()}`);
};

export const useGetPendingApprovals = (options?: { page?: number; limit?: number; type?: string }) => {
  return useQuery({
    queryKey: ['pending-approvals', options],
    queryFn: () => getPendingApprovals(options),
  });
};

export const approveMovie = async (id: string) => {
  return api(`/movies/item/${id}/approve`, { method: 'POST' });
};

export const rejectMovie = async (id: string, reason: string) => {
  return api(`/movies/item/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

export const useApproveMovie = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: approveMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const useRejectMovie = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => rejectMovie(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const useToggleMovieTrending = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: toggleMovieTrending,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
    },
  });
};

export const setupAdmin = async (data: { setupKey: string; email: string; password: string; name?: string }) => {
  return api('/auth/setup-admin', { method: 'POST', body: JSON.stringify(data) });
};

// Profile and Password API
export const updateProfile = async (data: { name?: string; email?: string; avatar?: string }) => {
  return api('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

export const updatePassword = async (data: { currentPassword: string; newPassword: string }) => {
  return api('/auth/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// Admin Users API
export const getAdminUsers = async (options?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.search) params.append('search', options.search);
  if (options?.role) params.append('role', options.role);
  if (options?.status) params.append('status', options.status);
  return api(`/api/admin-users?${params.toString()}`);
};

export const getAdminUserById = async (id: string) => {
  return api(`/api/admin-users/${id}`);
};

export const createAdminUser = async (data: any) => {
  return api('/api/admin-users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateAdminUser = async (id: string, data: any) => {
  return api(`/api/admin-users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteAdminUser = async (id: string) => {
  return api(`/api/admin-users/${id}`, { method: 'DELETE' });
};

export const resetAdminUserPassword = async (id: string) => {
  return api(`/api/admin-users/${id}/reset-password`, { method: 'POST' });
};

export const toggleAdminUserStatus = async (id: string) => {
  return api(`/api/admin-users/${id}/toggle-status`, { method: 'PATCH' });
};

export const updateAdminProfile = async (data: { email?: string; currentPassword?: string; newPassword?: string }) => {
  return api('/api/admin-users/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const useGetAdminUsers = (options?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) => {
  return useQuery({
    queryKey: ['admin-users', options],
    queryFn: () => getAdminUsers(options),
  });
};

export const useCreateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string; data: any }>({
    mutationFn: ({ id, data }) => updateAdminUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useResetAdminUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: resetAdminUserPassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useToggleAdminUserStatus = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: toggleAdminUserStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { name?: string; email?: string; avatar?: string }>({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useUpdatePassword = () => {
  return useMutation<any, Error, { currentPassword: string; newPassword: string }>({
    mutationFn: updatePassword,
  });
};

export const useBulkDeleteSubscriptionPlans = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteSubscriptionPlans,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptionPlans'] });
    }
  });
};

// Plan Limits API
export const getPlanLimits = async (options?: { page?: number; limit?: number; planId?: string }) => {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', options.page.toString());
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.planId) params.append('planId', options.planId);
  return api(`/plan-limits?${params.toString()}`);
};

export const getPlanLimitById = async (id: string) => {
  return api(`/plan-limits/${id}`);
};

export const createPlanLimit = async (data: any) => {
  return api('/plan-limits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updatePlanLimit = async (id: string, data: any) => {
  return api(`/plan-limits/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deletePlanLimit = async (id: string) => {
  return api(`/plan-limits/${id}`, { method: 'DELETE' });
};

export const bulkDeletePlanLimits = async (ids: string[]) => {
  return api('/plan-limits/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetPlanLimits = (options?: { page?: number; limit?: number; planId?: string }) => {
  return useQuery({
    queryKey: ['planLimits', options],
    queryFn: () => getPlanLimits(options)
  });
};

export const useGetPlanLimitById = (id: string) => {
  return useQuery({
    queryKey: ['planLimit', id],
    queryFn: () => getPlanLimitById(id),
    enabled: !!id
  });
};

export const useCreatePlanLimit = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createPlanLimit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
    }
  });
};

export const useUpdatePlanLimit = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updatePlanLimit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
    }
  });
};

export const useDeletePlanLimit = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deletePlanLimit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
    }
  });
};

export const useBulkDeletePlanLimits = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeletePlanLimits,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planLimits'] });
    }
  });
};

// FAQ API
export const getFAQs = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/faqs?${params.toString()}`);
};

export const getPublicFAQs = async (options?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  return api(`/faqs/public?${params.toString()}`);
};

export const useGetPublicFAQs = (options?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ['public-faqs', options],
    queryFn: () => getPublicFAQs(options)
  });
};

export const getFAQById = async (id: string) => {
  return api(`/faqs/item/${id}`);
};

export const createFAQ = async (data: { question: string; answer: string; status?: boolean }) => {
  return api('/faqs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateFAQ = async (id: string, data: { question?: string; answer?: string; status?: boolean }) => {
  return api(`/faqs/item/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteFAQ = async (id: string) => {
  return api(`/faqs/item/${id}`, { method: 'DELETE' });
};

export const bulkDeleteFAQs = async (ids: string[]) => {
  return api('/faqs/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetFAQs = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({
    queryKey: ['faqs', options],
    queryFn: () => getFAQs(options)
  });
};

export const useGetFAQById = (id: string) => {
  return useQuery({
    queryKey: ['faq', id],
    queryFn: () => getFAQById(id),
    enabled: !!id
  });
};

export const useCreateFAQ = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createFAQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    }
  });
};

export const useUpdateFAQ = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateFAQ(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      queryClient.invalidateQueries({ queryKey: ['faq', variables.id] });
    },
  });
};

export const useDeleteFAQ = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteFAQ,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    }
  });
};

export const useBulkDeleteFAQs = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteFAQs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
    }
  });
};

// Actors API
export const getActors = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/actors?${params.toString()}`);
};

export const getActorById = async (id: string) => {
  return api(`/actors/item/${id}`);
};

export const createActor = async (formData: FormData) => {
  return api('/actors', {
    method: 'POST',
    body: formData,
  });
};

export const updateActor = async (id: string, formData: FormData) => {
  return api(`/actors/item/${id}`, {
    method: 'PUT',
    body: formData,
  });
};

export const deleteActor = async (id: string) => {
  return api(`/actors/item/${id}`, { method: 'DELETE' });
};

export const bulkDeleteActors = async (ids: string[]) => {
  return api('/actors/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetActors = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({
    queryKey: ['actors', options],
    queryFn: () => getActors(options)
  });
};

export const useGetActorById = (id: string) => {
  return useQuery({
    queryKey: ['actor', id],
    queryFn: () => getActorById(id),
    enabled: !!id
  });
};

export const useCreateActor = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createActor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    }
  });
};

export const useUpdateActor = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, formData }: any) => updateActor(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    }
  });
};

export const useDeleteActor = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteActor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    }
  });
};

export const useBulkDeleteActors = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteActors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actors'] });
    }
  });
};

// Directors API
export const getDirectors = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/directors?${params.toString()}`);
};

export const getDirectorById = async (id: string) => {
  return api(`/directors/item/${id}`);
};

export const createDirector = async (formData: FormData) => {
  return api('/directors', {
    method: 'POST',
    body: formData,
  });
};

export const updateDirector = async (id: string, formData: FormData) => {
  return api(`/directors/item/${id}`, {
    method: 'PUT',
    body: formData,
  });
};

export const deleteDirector = async (id: string) => {
  return api(`/directors/item/${id}`, { method: 'DELETE' });
};

export const bulkDeleteDirectors = async (ids: string[]) => {
  return api('/directors/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetDirectors = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({
    queryKey: ['directors', options],
    queryFn: () => getDirectors(options)
  });
};

export const useGetDirectorById = (id: string) => {
  return useQuery({
    queryKey: ['director', id],
    queryFn: () => getDirectorById(id),
    enabled: !!id
  });
};

export const useCreateDirector = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createDirector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
    }
  });
};

export const useUpdateDirector = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, formData }: any) => updateDirector(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
    }
  });
};

export const useDeleteDirector = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteDirector,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
    }
  });
};

export const useBulkDeleteDirectors = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteDirectors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directors'] });
    }
  });
};

// Notification Logs API
export const getNotificationLogs = async (options?: { page?: number; limit?: number; type?: string }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.type && options.type !== 'all') params.set('type', options.type);
  return api(`/notification-logs?${params.toString()}`);
};

export const getNotificationLogById = async (id: string) => {
  return api(`/notification-logs/item/${id}`);
};

export const createNotificationLog = async (data: any) => {
  return api('/notification-logs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const deleteNotificationLog = async (id: string) => {
  return api(`/notification-logs/item/${id}`, { method: 'DELETE' });
};

export const bulkDeleteNotificationLogs = async (ids: string[]) => {
  return api('/notification-logs/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetNotificationLogs = (options?: { page?: number; limit?: number; type?: string }) => {
  return useQuery({
    queryKey: ['notification-logs', options],
    queryFn: () => getNotificationLogs(options)
  });
};

export const useGetNotificationLogById = (id: string) => {
  return useQuery({
    queryKey: ['notification-log', id],
    queryFn: () => getNotificationLogById(id),
    enabled: !!id
  });
};

export const useCreateNotificationLog = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createNotificationLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
    }
  });
};

export const useDeleteNotificationLog = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteNotificationLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
  });
};

export const useBulkDeleteNotificationLogs = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteNotificationLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    }
  });
};

// Subscriptions API
export const getSubscriptions = async (options?: { 
  page?: number; 
  limit?: number;
  plan?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.plan && options.plan !== 'All Plans') params.set('plan', options.plan);
  if (options?.dateFrom) params.set('dateFrom', options.dateFrom);
  if (options?.dateTo) params.set('dateTo', options.dateTo);
  if (options?.search) params.set('search', options.search);
  return api(`/subscriptions?${params.toString()}`);
};

export const getSubscriptionById = async (id: string) => {
  return api(`/subscriptions/${id}`);
};

export const createSubscription = async (data: any) => {
  return api('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const updateSubscription = async (id: string, data: any) => {
  return api(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const deleteSubscription = async (id: string) => {
  return api(`/subscriptions/${id}`, { method: 'DELETE' });
};

export const bulkDeleteSubscriptions = async (ids: string[]) => {
  return api('/subscriptions/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const useGetSubscriptions = (options?: any) => {
  return useQuery({
    queryKey: ['subscriptions', options],
    queryFn: () => getSubscriptions(options)
  });
};

export const useGetSubscriptionById = (id: string) => {
  return useQuery({
    queryKey: ['subscription', id],
    queryFn: () => getSubscriptionById(id),
    enabled: !!id
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateSubscription(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });
};

export const useBulkDeleteSubscriptions = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteSubscriptions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    }
  });
};

// Dashboard API
type DashboardDateOptions = { period?: string; startDate?: string; endDate?: string };

const buildDashboardParams = (options?: DashboardDateOptions) => {
  const params = new URLSearchParams();
  if (options?.period) params.set("period", options.period);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  return params.toString();
};

export const getDashboardStats = async (options?: DashboardDateOptions) => {
  const q = buildDashboardParams(options);
  const response = await api(`/dashboard/stats${q ? `?${q}` : ""}`);
  return response.data;
};

export const getRevenueData = async (options?: DashboardDateOptions) => {
  const response = await api(`/dashboard/revenue?${buildDashboardParams(options)}`);
  return response.data;
};

export const getNewSubscribersData = async (options?: DashboardDateOptions) => {
  const response = await api(`/dashboard/new-subscribers?${buildDashboardParams(options)}`);
  return response.data;
};

export const getMostWatchedData = async (options?: DashboardDateOptions) => {
  const response = await api(`/dashboard/most-watched?${buildDashboardParams(options)}`);
  return response.data;
};

export const getTopGenresData = async () => {
  const response = await api("/dashboard/top-genres");
  return response.data;
};

export const getReviews = async () => {
  const response = await api("/dashboard/reviews");
  return response.data;
};

export const getTransactions = async () => {
  const response = await api("/dashboard/transactions");
  return response.data;
};

// Dashboard Hooks
export const useGetDashboardStats = (options?: DashboardDateOptions) => {
  return useQuery({
    queryKey: ["dashboard-stats", options],
    queryFn: () => getDashboardStats(options),
  });
};

export const useGetRevenueData = (options?: DashboardDateOptions) => {
  return useQuery({
    queryKey: ["revenue-data", options],
    queryFn: () => getRevenueData(options),
  });
};

export const useGetNewSubscribersData = (options?: DashboardDateOptions) => {
  return useQuery({
    queryKey: ["new-subscribers-data", options],
    queryFn: () => getNewSubscribersData(options),
  });
};

export const useGetMostWatchedData = (options?: DashboardDateOptions) => {
  return useQuery({
    queryKey: ["most-watched-data", options],
    queryFn: () => getMostWatchedData(options),
  });
};

export const useGetTopGenresData = () => {
  return useQuery({
    queryKey: ["top-genres-data"],
    queryFn: getTopGenresData,
  });
};

export const useGetReviews = () => {
  return useQuery({
    queryKey: ["reviews-data"],
    queryFn: getReviews,
  });
};

// Admin Reviews API
export const getAdminReviewsList = async (options?: { page?: number; limit?: number; status?: string; contentId?: string; userId?: string }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.status) params.set("status", options.status);
  if (options?.contentId) params.set("contentId", options.contentId);
  if (options?.userId) params.set("userId", options.userId);
  return api(`/admin/reviews?${params.toString()}`);
};

export const updateAdminReviewStatus = async (id: string, status: 'published' | 'hidden') => {
  return api(`/admin/reviews/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
    headers: { "Content-Type": "application/json" },
  });
};

export const deleteAdminReview = async (id: string) => {
  return api(`/admin/reviews/${id}`, {
    method: "DELETE",
  });
};

export const useGetAdminReviewsList = (options?: { page?: number; limit?: number; status?: string; contentId?: string; userId?: string }) => {
  return useQuery({
    queryKey: ["admin-reviews", options],
    queryFn: () => getAdminReviewsList(options),
  });
};

// --- App Reviews API ---
export const getAppReviews = async (page = 1, limit = 10) => {
  return api(`/app/reviews?page=${page}&limit=${limit}`);
};

export const createAppReview = async (payload: { rating: number; comment: string }) => {
  return api(`/app/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
};

export const deleteAppReview = async (id: string) => {
  return api(`/app/reviews/${id}`, {
    method: "DELETE",
  });
};

export const useGetAppReviews = (page = 1) => {
  return useQuery({
    queryKey: ["app-reviews", page],
    queryFn: () => getAppReviews(page),
  });
};

export const useGetTransactions = () => {
  return useQuery({
    queryKey: ["transactions-data"],
    queryFn: getTransactions,
  });
};

export const loginClient = async (data: { email: string; password: string }) => { return api('/app/auth/login', { method: 'POST', body: JSON.stringify(data) }); };
export const registerClient = async (data: { email: string; password: string; name: string; phone?: string }) => { return api('/app/auth/register', { method: 'POST', body: JSON.stringify(data) }); };

// Countries API
export const getCountries = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/countries?${params.toString()}`);
};

export const getCountryById = async (id: string) => {
  return api(`/countries/${id}`);
};

export const useGetCountryById = (id: string) => {
  return useQuery({ queryKey: ['country', id], queryFn: () => getCountryById(id), enabled: !!id });
};

export const createCountry = async (data: any) => {
  return api('/countries', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
};

export const updateCountry = async (id: string, data: any) => {
  return api(`/countries/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
};

export const deleteCountry = async (id: string) => {
  return api(`/countries/${id}`, { method: 'DELETE' });
};

export const useGetCountries = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({ queryKey: ['countries', options], queryFn: () => getCountries(options) });
};

export const useCreateCountry = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data: any) => createCountry(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['countries'] }); }
  });
};

export const useUpdateCountry = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateCountry(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['countries'] }); }
  });
};

export const useDeleteCountry = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (id: string) => deleteCountry(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['countries'] }); }
  });
};

// Crews API
export const getCrews = async (options?: { page?: number; limit?: number; admin?: boolean }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.admin) params.set('admin', 'true');
  return api(`/crews?${params.toString()}`);
};

export const getCrewById = async (id: string) => {
  return api(`/crews/${id}`);
};

export const useGetCrewById = (id: string) => {
  return useQuery({ queryKey: ['crew', id], queryFn: () => getCrewById(id), enabled: !!id });
};

export const createCrew = async (data: any) => {
  return api('/crews', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
};

export const updateCrew = async (id: string, data: any) => {
  return api(`/crews/${id}`, { method: 'PUT', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
};

export const deleteCrew = async (id: string) => {
  return api(`/crews/${id}`, { method: 'DELETE' });
};

export const bulkDeleteCrews = async (ids: string[]) => {
  return api('/crews/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const useGetCrews = (options?: { page?: number; limit?: number; admin?: boolean }) => {
  return useQuery({ queryKey: ['crews', options], queryFn: () => getCrews(options) });
};

export const useCreateCrew = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (data: any) => createCrew(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crews'] }); }
  });
};

export const useUpdateCrew = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: ({ id, data }: any) => updateCrew(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crews'] }); }
  });
};

export const useDeleteCrew = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: (id: string) => deleteCrew(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crews'] }); }
  });
};

export const useBulkDeleteCrews = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, string[]>({
    mutationFn: bulkDeleteCrews,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['crews'] }); }
  });
};

export const useGetAdminNotifications = () => {
  return useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => api("/admin-notifications"),
    refetchInterval: 30000, // Poll every 30 seconds
  });
};

export const useMarkAdminNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api("/admin-notifications/read-all", {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
    },
  });
};

// ─── WISHLIST (Public User) ───────────────────────────────────────────────────

export const getWishlist = async (options?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  const profileId = getActiveProfileId();
  if (profileId) params.set('profileId', profileId);
  return api(`/app/wishlist?${params.toString()}`);
};

export const toggleWishlistItem = async (data: { contentId: string; contentType: 'movie' | 'show' | 'drama' }) => {
  const type = data.contentType === 'movie' ? 'movie' : 'show';
  return api('/app/wishlist', {
    method: 'POST',
    body: JSON.stringify({ contentId: data.contentId, type, profileId: getActiveProfileId() || undefined }),
  });
};

export const useGetWishlist = (options?: { page?: number; limit?: number }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('appAccessToken') : null;
  return useQuery({
    queryKey: ['wishlist', options, token],
    queryFn: async () => {
      if (!token) return { items: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
      const res = await getWishlist(options);
      return res.data;
    },
    retry: false,
    staleTime: 30000,
  });
};

export const useToggleWishlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleWishlistItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['app-profile'] });
    },
  });
};

// ─── DOWNLOADS (Web — separate from app endpoints) ────────────────────────────

export const getDownloads = async (options?: { page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', options.page.toString());
  if (options?.limit) params.set('limit', options.limit.toString());
  const profileId = getActiveProfileId();
  if (profileId) params.set('profileId', profileId);
  return api(`/web/downloads?${params.toString()}`);
};

export const requestDownload = async (data: { contentId: string; contentType: 'movie' | 'drama' | 'series'; episodeId?: string }) => {
  return api('/web/download', {
    method: 'POST',
    body: JSON.stringify({ ...data, profileId: getActiveProfileId() || undefined }),
  });
};

export const removeDownload = async (id: string) => {
  return api(`/web/downloads/${id}`, { method: 'DELETE' });
};

export const useGetDownloads = (options?: { page?: number; limit?: number }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('appAccessToken') : null;
  return useQuery({
    queryKey: ['downloads', options, token],
    queryFn: async () => {
      if (!token) return [];
      const res = await getDownloads(options);
      return res.data;
    },
    retry: false,
    staleTime: 30000,
  });
};

export const useRemoveDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; contentId: string; episodeId?: string }) => {
      return removeDownload(id);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['app-profile'] });
      removeOfflineVideo(variables.contentId, variables.episodeId);
    },
  });
};

export const useRequestDownload = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestDownload,
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['downloads'] });
      queryClient.invalidateQueries({ queryKey: ['app-profile'] });
      if (res?.success && res?.data?.downloadUrl) {
        cacheDownloadedVideo(res.data.downloadUrl, variables.contentId, variables.episodeId);
      }
    },
  });
};

// ─── APP PROFILE (Public User) ───────────────────────────────────────────────

export const getAppProfile = async () => {
  return api('/app/profile');
};

export const useGetAppProfile = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('appAccessToken') : null;
  return useQuery({
    queryKey: ['app-profile', token],
    queryFn: async () => {
      if (!token) return null;
      const res = await getAppProfile();
      return res.data;
    },
    retry: false,
    staleTime: 30000,
  });
};

// Update app user profile (name / email / avatar URL / phone)
export const updateAppProfile = async (data: { name?: string; email?: string; avatar?: string; phone?: string }) => {
  return api('/app/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
};

// Upload avatar image file — returns { avatarUrl }
export const uploadProfileAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api('/app/profile/avatar', {
    method: 'POST',
    body: formData,
  });
  return res.data;
};

// Upload admin profile avatar via server-side upload
export const uploadAdminAvatar = async (file: File): Promise<{ avatarUrl: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await api('/auth/profile/avatar', { method: 'POST', body: formData });
  return res.data;
};

// ─── LIKES (Public User) ──────────────────────────────────────────────────────

export const toggleLikeItem = async (data: { contentId: string; contentType: 'movie' | 'show' | 'drama'; episodeId?: string }) => {
  return api(`/like/${data.contentId}`, {
    method: 'POST',
    body: JSON.stringify({ contentType: data.contentType, episodeId: data.episodeId }),
  });
};

export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleLikeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-profile'] });
    },
  });
};

// ─── VIEWS & SHARES (Public User) ────────────────────────────────────────────

export const recordViewItem = async (data: { contentId: string; contentType: 'movie' | 'show' | 'drama'; episodeId?: string }) => {
  return api(`/views/${data.contentId}`, {
    method: 'POST',
    body: JSON.stringify({ contentType: data.contentType, episodeId: data.episodeId }),
  });
};

export const useRecordView = () => {
  return useMutation({
    mutationFn: recordViewItem,
  });
};

export const recordShareItem = async (data: { contentId: string; contentType: 'movie' | 'show' | 'drama' }) => {
  return api(`/share/${data.contentId}`, {
    method: 'POST',
    body: JSON.stringify({ contentType: data.contentType }),
  });
};

export const useRecordShare = () => {
  return useMutation({
    mutationFn: recordShareItem,
  });
};


// ─── WATCH PROGRESS (Continue Watching) ──────────────────────────────────────

export const saveWatchProgress = async (data: {
  contentId: string;
  episodeId?: string;
  progressSeconds: number;
  durationSeconds: number;
}) => {
  return api("/app/watch/progress", {
    method: "POST",
    body: JSON.stringify({ ...data, profileId: getActiveProfileId() || undefined }),
  });
};

export const useSaveWatchProgress = () => {
  return useMutation({
    mutationFn: saveWatchProgress,
  });
};

export const useGetWatchProgress = (contentId?: string, episodeId?: string) => {
  const token = getAuthToken();
  return useQuery({
    queryKey: ["watch-progress", contentId, episodeId, getActiveProfileId()],
    queryFn: async () => {
      const params = new URLSearchParams({ contentId: contentId! });
      if (episodeId) params.set("episodeId", episodeId);
      const profileId = getActiveProfileId();
      if (profileId) params.set("profileId", profileId);
      const res = await fetch(`${baseUrl}/api/app/watch/progress?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as { progressSeconds: number; durationSeconds: number; progressPercent: number } | null;
    },
    enabled: !!contentId && !!token,
    staleTime: 0,
  });
};

export const useGetWatchHistory = (options?: { page?: number; limit?: number }) => {
  const token = getAuthToken();
  const profileId = getActiveProfileId();
  return useQuery({
    queryKey: ["watch-history", profileId, options?.page, options?.limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.set("page", String(options.page));
      if (options?.limit) params.set("limit", String(options.limit));
      if (profileId) params.set("profileId", profileId);
      const res = await api(`/app/watch/history?${params}`);
      return res.data;
    },
    enabled: !!token,
  });
};

// ─── OFFLINE CACHE (IndexedDB/Caches offline watch) ──────────────────────────

export const cacheDownloadedVideo = async (
  url: string,
  contentId: string,
  episodeId?: string,
  onProgress?: (pct: number) => void
): Promise<boolean> => {
  // Store metadata so the downloads list can display it offline
  try {
    const key = 'offline_downloads_meta';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const metaKey = episodeId ? `episode-${episodeId}` : `movie-${contentId}`;
    if (!existing.find((m: any) => m.key === metaKey)) {
      existing.push({ key: metaKey, contentId, episodeId, url, cachedAt: Date.now() });
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {}

  if (!('caches' in window)) return false;

  const cacheKey = episodeId ? `episode-${episodeId}` : `movie-${contentId}`;
  try {
    const cache = await caches.open('video-offline-cache');
    const existingEntry = await cache.match(cacheKey);
    if (existingEntry) { onProgress?.(100); return true; }

    // Stream the file so we can report progress
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok || !response.body) return false;

    const contentLength = Number(response.headers.get('Content-Length') || '0');
    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength > 0) onProgress?.(Math.round((received / contentLength) * 100));
    }

    const blob = new Blob(chunks, {
      type: response.headers.get('Content-Type') || 'video/mp4',
    });
    await cache.put(cacheKey, new Response(blob, {
      headers: { 'Content-Type': blob.type },
    }));
    onProgress?.(100);
    return true;
  } catch (error) {
    console.warn('Could not cache video for offline use:', error);
    return false;
  }
};

export const getOfflineVideoUrl = async (contentId: string, episodeId?: string): Promise<string | null> => {
  // 1. Check sessionStorage (set when user taps play from downloads list)
  const sessionKey = `offline_url_${contentId}_${episodeId || ''}`;
  const sessionUrl = sessionStorage.getItem(sessionKey);
  if (sessionUrl) return sessionUrl;

  // 2. Check browser Cache API
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open('video-offline-cache');
    const cacheKey = episodeId ? `episode-${episodeId}` : `movie-${contentId}`;
    const matched = await cache.match(cacheKey);
    if (matched) {
      const blob = await matched.blob();
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.warn('Error reading offline cache:', error);
  }
  return null;
};

export const removeOfflineVideo = async (contentId: string, episodeId?: string) => {
  // Remove from localStorage metadata
  try {
    const key = 'offline_downloads_meta';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const metaKey = episodeId ? `episode-${episodeId}` : `movie-${contentId}`;
    localStorage.setItem(key, JSON.stringify(existing.filter((m: any) => m.key !== metaKey)));
  } catch {}
  // Remove from sessionStorage
  sessionStorage.removeItem(`offline_url_${contentId}_${episodeId || ''}`);
  // Remove from browser Cache API
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open('video-offline-cache');
    const cacheKey = episodeId ? `episode-${episodeId}` : `movie-${contentId}`;
    await cache.delete(cacheKey);
  } catch {}
};

// --- COIN PACKAGES (Admin) ---

export const useGetCoinPackages = () => {
  return useQuery({
    queryKey: ["/wallet/packages"],
    queryFn: () => api("/wallet/packages"),
  });
};

export const useCreateCoinPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      api("/wallet/packages", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/packages"] });
    },
  });
};

export const useUpdateCoinPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api(`/wallet/packages/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/packages"] });
    },
  });
};

export const useDeleteCoinPackage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api(`/wallet/packages/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/packages"] });
    },
  });
};

export const useUnlockEpisode = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { episodeId: string }) =>
      api("/wallet/unlock-episode", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-data"] });
      queryClient.invalidateQueries({ queryKey: ["/wallet/balance"] });
      queryClient.invalidateQueries(); 
    },
  });
};

export const useGetWalletData = () => {
  return useQuery({
    queryKey: ["/wallet/balance"],
    queryFn: () => api("/wallet/balance"),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/wallet/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/balance"] });
    },
  });
};

export const useClearTransactions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/wallet/transactions", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/balance"] });
    },
  });
};

export const useTopUpWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { packageId: string; transactionId: string }) =>
      api("/wallet/topup", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/wallet/balance"] });
    },
  });
};

// ── Razorpay Wallet Top-up ───────────────────────────────────────────────────

export const createWalletRazorpayOrder = async (data: { packageId: string }) => {
  return api('/wallet/razorpay/order', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const verifyWalletRazorpayPayment = async (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  packageId: string;
}) => {
  return api('/wallet/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const useCreateWalletRazorpayOrder = () => {
  return useMutation({
    mutationFn: createWalletRazorpayOrder,
  });
};

export const useVerifyWalletRazorpayPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyWalletRazorpayPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/wallet/balance'] });
    },
  });
};

// ── Razorpay Subscription Purchase ──────────────────────────────────────────

export const createSubscriptionRazorpayOrder = async (data: { planId: string; userId?: string }) => {
  return api('/app/subscription/razorpay/order', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const verifySubscriptionRazorpayPayment = async (data: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: string;
  userId?: string;
}) => {
  return api('/app/subscription/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const useCreateSubscriptionRazorpayOrder = () => {
  return useMutation({
    mutationFn: createSubscriptionRazorpayOrder,
  });
};

export const useVerifySubscriptionRazorpayPayment = () => {
  return useMutation({
    mutationFn: verifySubscriptionRazorpayPayment,
  });
};

// ── Razorpay Script Loader ───────────────────────────────────────────────────

export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export interface RazorpayOptions {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  onSuccess: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  onDismiss?: () => void;
}

export const openRazorpayCheckout = async (opts: RazorpayOptions): Promise<void> => {
  const loaded = await loadRazorpayScript();
  if (!loaded) throw new Error('Razorpay SDK failed to load');
  const rzp = new (window as any).Razorpay({
    key: opts.keyId,
    order_id: opts.orderId,
    amount: opts.amount,
    currency: opts.currency || 'INR',
    name: opts.name,
    description: opts.description,
    prefill: opts.prefill || {},
    theme: opts.theme || { color: '#E50000' },
    handler: (response: any) => opts.onSuccess(response),
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
  });
  rzp.open();
};

// ─── App Notifications & Rewards ───────────────────────────────────────────────

export const useGetAppNotifications = () => {
  return useQuery({
    queryKey: ['appNotifications'],
    queryFn: async () => {
      const res = await api('/app/notifications');
      return res?.data || [];
    },
    staleTime: 60 * 1000,
  });
};

export const useGetRewardStatus = () => {
  return useQuery({
    queryKey: ['rewardStatus'],
    queryFn: async () => {
      const res = await api('/app/rewards/status');
      return res?.data || { canClaim: false, nextClaimTime: null };
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useClaimDailyReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      return api('/app/rewards/claim-daily', { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewardStatus'] });
      queryClient.invalidateQueries({ queryKey: ['walletData'] });
    },
  });
};

// ─── Reward Definitions (Admin) ───────────────────────────────────────────────

export const useGetAdminRewardDefinitions = () => {
  return useQuery({
    queryKey: ['adminRewardDefinitions'],
    queryFn: async () => {
      const res = await api('/app/rewards/admin', { useAdminToken: true });
      return res?.data || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useCreateRewardDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string;
      type: string;
      coinsReward: number;
      requiredCount?: number;
      isActive: boolean;
      isOneTime: boolean;
      iconUrl?: string;
      order?: number;
    }) => {
      return api('/app/rewards/admin', {
        method: 'POST',
        body: JSON.stringify(payload),
        useAdminToken: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRewardDefinitions'] });
    },
  });
};

export const useUpdateRewardDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: string; [key: string]: any }) => {
      return api(`/app/rewards/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        useAdminToken: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRewardDefinitions'] });
    },
  });
};

export const useDeleteRewardDefinition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return api(`/app/rewards/admin/${id}`, {
        method: 'DELETE',
        useAdminToken: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRewardDefinitions'] });
    },
  });
};

export const useGetPublicRewardDefinitions = () => {
  return useQuery({
    queryKey: ['publicRewardDefinitions'],
    queryFn: async () => {
      const res = await api('/app/rewards');
      return res?.data || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useClaimRewardById = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      return api(`/app/rewards/claim/${rewardId}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publicRewardDefinitions'] });
      queryClient.invalidateQueries({ queryKey: ['walletData'] });
    },
  });
};

// ─── Unlocked Episodes ────────────────────────────────────────────────────────

export const useGetUnlockedEpisodes = () => {
  return useQuery({
    queryKey: ['unlockedEpisodes'],
    queryFn: async () => {
      const res = await api('/wallet/unlocked-episodes');
      return res?.data || [];
    },
    staleTime: 60 * 1000,
  });
};
