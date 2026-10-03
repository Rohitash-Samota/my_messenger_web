const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || "").replace(/\/$/, "");
const AUTH_STORAGE_KEY = "wavely.auth.session";
const AUTH_EVENT = "wavely:auth-session";

export const externalApiEnabled = Boolean(configuredBaseUrl);

export class ApiError extends Error {
  constructor(message, { status = 0, code = "request_failed", details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function storage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getAuthSession() {
  try {
    const value = storage()?.getItem(AUTH_STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getAccessToken() {
  return getAuthSession()?.accessToken || null;
}

function saveAuthSession(session) {
  if (!session) {
    storage()?.removeItem(AUTH_STORAGE_KEY);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(AUTH_EVENT));
    return null;
  }
  storage()?.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: session }));
  }
  return session;
}

export function subscribeAuthSession(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = () => listener(getAuthSession());
  window.addEventListener(AUTH_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(AUTH_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export const buildApiUrl = (path) => {
  if (/^https?:\/\//i.test(path) || /^blob:|^data:/i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

async function parsePayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text ? { data: text } : null;
}

let refreshPromise = null;

async function refreshAuthSession() {
  const current = getAuthSession();
  if (!current?.refreshToken) {
    throw new ApiError("Your session has expired.", { status: 401, code: "session_expired" });
  }
  if (!refreshPromise) {
    refreshPromise = fetch(buildApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    })
      .then(async (response) => {
        const payload = await parsePayload(response);
        if (!response.ok) {
          throw new ApiError("Your session has expired.", { status: 401, code: "session_expired" });
        }
        return saveAuthSession({ ...payload, email: current.email });
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request(path, options = {}, retried = false) {
  const { body, headers, auth = externalApiEnabled, ...fetchOptions } = options;
  const token = auth ? getAccessToken() : null;
  const formData = typeof FormData !== "undefined" && body instanceof FormData;
  let response;
  try {
    response = await fetch(buildApiUrl(path), {
      cache: "no-store",
      ...fetchOptions,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && !formData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: formData ? body : JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new ApiError("Unable to reach the messaging service.", {
      code: "network_error",
      details: error instanceof Error ? error.message : null,
    });
  }

  if (response.status === 401 && auth && externalApiEnabled && !retried && getAuthSession()?.refreshToken) {
    try {
      await refreshAuthSession();
      return request(path, options, true);
    } catch {
      saveAuthSession(null);
    }
  }

  const payload = await parsePayload(response);
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || payload?.detail || payload?.message || `Request failed with status ${response.status}.`,
      {
        status: response.status,
        code: payload?.error?.code || payload?.code || "request_failed",
        details: payload?.error?.details || null,
      },
    );
  }
  return payload?.data ?? payload;
}

export async function login({ email, password }) {
  const session = await request("/api/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  return saveAuthSession({ ...session, email: email.trim().toLowerCase() });
}

export async function register({ email, password, mobileNumber }) {
  const session = await request("/api/auth/register", {
    method: "POST",
    body: { email, password, mobileNumber: Number(mobileNumber) },
    auth: false,
  });
  return saveAuthSession({ ...session, email: email.trim().toLowerCase() });
}

export async function logout() {
  const session = getAuthSession();
  try {
    if (externalApiEnabled && session?.refreshToken) {
      await request("/api/auth/logout", {
        method: "POST",
        body: { refreshToken: session.refreshToken },
        auth: false,
      });
    }
  } finally {
    saveAuthSession(null);
  }
}

export function getCurrentUser({ signal } = {}) {
  if (!externalApiEnabled) {
    return Promise.resolve({ id: "me", email: "demo@wavely.local", name: "Rohit Samota" });
  }
  return request("/api/auth/me", { signal });
}

export function searchUsers(query, { signal } = {}) {
  const search = String(query || "").trim();
  if (!search || !externalApiEnabled) return Promise.resolve([]);

  const params = new URLSearchParams({ q: search });
  return request(`/v1/api/users?${params.toString()}`, { signal }).then((payload) =>
    payload?.items || payload?.users || payload?.results || (Array.isArray(payload) ? payload : []),
  );
}

export function createConversation({ recipientEmail, participantUserId, peerUserId } = {}, { signal } = {}) {
  if (!externalApiEnabled) {
    return Promise.reject(
      new ApiError("Creating demo conversations requires the Spring API.", {
        code: "external_api_required",
      }),
    );
  }

  const email = String(recipientEmail || "").trim().toLowerCase();
  const userId = participantUserId ?? peerUserId;
  if (!email && !userId) {
    return Promise.reject(
      new ApiError("Choose a person to start a conversation.", {
        code: "missing_recipient",
      }),
    );
  }

  return request("/v1/api/conversions", {
    method: "POST",
    body: email ? { recipientEmail: email } : { participantUserId: Number(userId) },
    signal,
  }).then((payload) => payload?.conversation || payload);
}

export function getConversations({ query = "", signal } = {}) {
  if (externalApiEnabled) {
    return request("/v1/api/conversions?archived=false&limit=100", { signal })
      .then((payload) => payload?.items || []);
  }
  const search = new URLSearchParams();
  if (query.trim()) search.set("q", query.trim());
  const suffix = search.size ? `?${search.toString()}` : "";
  return request(`/api/conversations${suffix}`, { signal, auth: false });
}

export function getMessages(conversationId, { signal } = {}) {
  if (!conversationId) {
    return Promise.reject(new ApiError("A conversation id is required.", { code: "missing_conversation_id" }));
  }
  if (externalApiEnabled) {
    return request(`/v1/api/messages/${encodeURIComponent(conversationId)}?limit=100`, { signal })
      .then((payload) => [...(payload?.items || [])].reverse());
  }
  return request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, { signal, auth: false });
}

export function sendMessage(conversationId, payload, { signal } = {}) {
  if (!conversationId) {
    return Promise.reject(new ApiError("A conversation id is required.", { code: "missing_conversation_id" }));
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return Promise.reject(new ApiError("A message payload is required.", { code: "invalid_message_payload" }));
  }
  if (externalApiEnabled) {
    const normalizedType = String(payload.type || payload.messageType || "text").toLowerCase();
    const messageType = ({
      text: "TEXT",
      image: "IMAGE",
      video: "VIDEO",
      voice: "AUDIO",
      audio: "AUDIO",
      file: "DOCUMENT",
      document: "DOCUMENT",
    })[normalizedType] || "TEXT";
    const content = String(
      payload.content ?? payload.mediaUrl ?? payload.url ?? payload.text ?? "",
    ).trim();
    return request(`/v1/api/messages/${encodeURIComponent(conversationId)}`, {
      method: "POST",
      body: {
        clientMessageId:
          payload.clientMessageId ||
          globalThis.crypto?.randomUUID?.() ||
          `web-${Date.now()}`,
        content,
        messageType,
        parentMessageId: payload.parentMessageId ?? payload.replyTo?.id ?? null,
      },
      signal,
    }).then((message) => ({ ...message, direction: "outgoing" }));
  }
  return request(`/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: payload,
    signal,
    auth: false,
  });
}

export function markMessagesDelivered(conversationId, upToMessageId, { signal } = {}) {
  if (!externalApiEnabled) return Promise.resolve(null);
  return request(`/v1/api/messages/${encodeURIComponent(conversationId)}/delivered`, {
    method: "PATCH",
    ...(upToMessageId ? { body: { upToMessageId: Number(upToMessageId) } } : {}),
    signal,
  });
}

export function markMessagesRead(conversationId, upToMessageId, { signal } = {}) {
  if (!externalApiEnabled) return Promise.resolve(null);
  return request(`/v1/api/messages/${encodeURIComponent(conversationId)}/read`, {
    method: "PATCH",
    ...(upToMessageId ? { body: { upToMessageId: Number(upToMessageId) } } : {}),
    signal,
  });
}

export async function uploadMedia(conversationId, file, { signal } = {}) {
  if (!conversationId) {
    throw new ApiError("A conversation id is required.", {
      code: "missing_conversation_id",
    });
  }
  if (!(file instanceof Blob)) {
    throw new ApiError("Choose a valid media file.", { code: "invalid_media_file" });
  }

  const messageType = mediaTypeFromContentType(file.type);
  if (messageType === "DOCUMENT") {
    throw new ApiError("Only images, videos, and voice recordings can be uploaded.", {
      code: "unsupported_media_type",
    });
  }

  if (!externalApiEnabled) {
    const type = file.type || "application/octet-stream";
    return {
      url: URL.createObjectURL(file),
      fileName: file.name || "attachment",
      contentType: type,
      size: file.size,
      messageType,
      localObjectUrl: true,
    };
  }

  const form = new FormData();
  form.append("file", file, file.name || "attachment");
  const params = new URLSearchParams({
    conversationId: String(conversationId),
    messageType,
  });
  return request(`/v1/api/media?${params.toString()}`, {
    method: "POST",
    body: form,
    signal,
  }).then((payload) => {
    const media = payload?.media || payload?.attachment || payload || {};
    const fileName =
      media.fileName || media.originalFilename || media.originalName || file.name || "attachment";
    return {
      ...media,
      fileName,
      originalFilename: media.originalFilename || fileName,
      contentType: media.contentType || file.type || "application/octet-stream",
      size: Number(media.size ?? file.size),
      messageType: String(media.messageType || mediaTypeFromContentType(media.contentType || file.type)).toUpperCase(),
    };
  });
}

function mediaTypeFromContentType(contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.startsWith("image/")) return "IMAGE";
  if (type.startsWith("video/")) return "VIDEO";
  if (type.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

async function fetchProtectedMedia(path, { signal } = {}, retried = false) {
  if (!externalApiEnabled || /^blob:|^data:/i.test(path)) {
    const response = await fetch(path, { signal });
    if (!response.ok) throw new ApiError("Media could not be loaded.", { status: response.status });
    return response.blob();
  }

  const token = getAccessToken();
  const response = await fetch(buildApiUrl(path), {
    cache: "force-cache",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  if (response.status === 401 && !retried && getAuthSession()?.refreshToken) {
    await refreshAuthSession();
    return fetchProtectedMedia(path, { signal }, true);
  }
  if (!response.ok) {
    throw new ApiError("Media could not be loaded.", {
      status: response.status,
      code: "media_load_failed",
    });
  }
  return response.blob();
}

export async function getMediaObjectUrl(path, { signal } = {}) {
  if (!path) return null;
  if (!externalApiEnabled || /^blob:|^data:/i.test(path)) return path;
  const blob = await fetchProtectedMedia(path, { signal });
  return URL.createObjectURL(blob);
}
