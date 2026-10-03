"use client";

import { Client } from "@stomp/stompjs";

export const CALL_SIGNAL_TYPES = Object.freeze({
  INVITE: "INVITE",
  RINGING: "RINGING",
  ACCEPT: "ACCEPT",
  REJECT: "REJECT",
  BUSY: "BUSY",
  OFFER: "OFFER",
  ANSWER: "ANSWER",
  ICE_CANDIDATE: "ICE_CANDIDATE",
  HANGUP: "HANGUP",
});

export const CALL_MEDIA_TYPES = Object.freeze({
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
});

const SIGNAL_DESTINATION = "/app/calls.signal";
const CALLS_QUEUE = "/user/queue/calls";
const ERRORS_QUEUE = "/user/queue/errors";
const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "";
const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const allowedSignalTypes = new Set(Object.values(CALL_SIGNAL_TYPES));
const allowedMediaTypes = new Set(Object.values(CALL_MEDIA_TYPES));

export class CallClientError extends Error {
  constructor(message, { code = "call_client_error", details = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "CallClientError";
    this.code = code;
    this.details = details;
  }
}

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");

function toWebSocketUrl(value, { appendWebSocketPath = false } = {}) {
  const browserOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(value || browserOrigin, browserOrigin);

  if (url.protocol === "https:") url.protocol = "wss:";
  else if (url.protocol === "http:") url.protocol = "ws:";
  else if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new CallClientError(`Unsupported signaling URL protocol: ${url.protocol}`, {
      code: "invalid_socket_url",
    });
  }

  if (appendWebSocketPath) {
    const basePath = trimTrailingSlash(url.pathname || "");
    url.pathname = `${basePath}/ws`.replace(/\/{2,}/g, "/");
  }

  return url.toString();
}

/**
 * Resolves the STOMP broker URL. An explicit socket URL wins; otherwise the
 * public API base is converted to ws/wss and receives a trailing `/ws` path.
 */
export function resolveCallSocketUrl({
  socketUrl = configuredSocketUrl,
  apiBaseUrl = configuredApiBaseUrl,
} = {}) {
  const explicit = socketUrl.trim();
  if (explicit) return toWebSocketUrl(explicit);

  return toWebSocketUrl(apiBaseUrl.trim(), { appendWebSocketPath: true });
}

const parseJson = (body) => {
  if (!body) return null;
  if (typeof body !== "string") return body;

  try {
    return JSON.parse(body);
  } catch (cause) {
    throw new CallClientError("The signaling server returned invalid JSON.", {
      code: "invalid_signal_json",
      details: body.slice(0, 240),
      cause,
    });
  }
};

const normalizeCandidate = (candidate) => {
  if (!candidate || typeof candidate !== "object") return null;

  return {
    candidate: String(candidate.candidate || ""),
    sdpMid: candidate.sdpMid == null ? null : String(candidate.sdpMid),
    sdpMLineIndex:
      candidate.sdpMLineIndex == null ? null : Number(candidate.sdpMLineIndex),
    usernameFragment:
      candidate.usernameFragment == null ? null : String(candidate.usernameFragment),
  };
};

/**
 * Normalizes and validates messages received from `/user/queue/calls`.
 */
export function normalizeCallSignal(value) {
  const signal = typeof value === "string" ? parseJson(value) : value;
  if (!signal || typeof signal !== "object" || Array.isArray(signal)) {
    throw new CallClientError("The signaling server returned an invalid call event.", {
      code: "invalid_call_signal",
      details: signal,
    });
  }

  const type = String(signal.type || "").toUpperCase();
  const mediaType = signal.mediaType == null ? null : String(signal.mediaType).toUpperCase();
  const conversationId = Number(signal.conversationId);

  if (!signal.callId || !allowedSignalTypes.has(type)) {
    throw new CallClientError("The call event is missing a valid callId or type.", {
      code: "invalid_call_signal",
      details: signal,
    });
  }

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    throw new CallClientError("The call event has an invalid conversationId.", {
      code: "invalid_call_signal",
      details: signal,
    });
  }

  if (mediaType !== null && !allowedMediaTypes.has(mediaType)) {
    throw new CallClientError("The call event has an invalid mediaType.", {
      code: "invalid_call_signal",
      details: signal,
    });
  }

  return {
    callId: String(signal.callId),
    conversationId,
    type,
    mediaType,
    sdp: signal.sdp == null ? null : String(signal.sdp),
    candidate: normalizeCandidate(signal.candidate),
    senderUserId: signal.senderUserId ?? null,
    sender: signal.sender ?? null,
    sentAt: signal.sentAt ?? null,
  };
}

function normalizeOutgoingSignal(signal) {
  const normalized = normalizeCallSignal(signal);

  return {
    callId: normalized.callId,
    conversationId: normalized.conversationId,
    type: normalized.type,
    mediaType: normalized.mediaType,
    sdp: normalized.sdp,
    candidate: normalized.candidate,
  };
}

function normalizeToken(token) {
  const value = String(token || "").trim();
  if (!value) return "";
  return value.toLowerCase().startsWith("bearer ") ? value : `Bearer ${value}`;
}

function serverErrorFromFrame(frame) {
  let payload;
  try {
    payload = parseJson(frame?.body);
  } catch {
    payload = null;
  }

  const headerMessage = frame?.headers?.message;
  const message =
    payload?.message || headerMessage || frame?.body || "The signaling server rejected the request.";

  return new CallClientError(message, {
    code: payload?.code || "stomp_error",
    details: payload || frame?.headers || null,
  });
}

/**
 * Small STOMP wrapper dedicated to the backend call-signaling contract.
 */
export class CallClient {
  constructor({
    token,
    socketUrl,
    apiBaseUrl,
    onSignal,
    onError,
    onConnectionChange,
    debug = false,
    reconnectDelay = 3000,
  } = {}) {
    this.token = token;
    this.socketUrl = resolveCallSocketUrl({ socketUrl, apiBaseUrl });
    this.onSignal = onSignal;
    this.onError = onError;
    this.onConnectionChange = onConnectionChange;
    this.debug = debug;
    this.reconnectDelay = reconnectDelay;
    this.client = null;
    this.subscriptions = [];
    this.connectPromise = null;
    this.cancelInitialConnection = null;
    this.connectionWaiters = new Set();
    this.manualDisconnect = false;
  }

  get connected() {
    return Boolean(this.client?.connected);
  }

  get active() {
    return Boolean(this.client?.active);
  }

  setToken(token) {
    this.token = token;
    if (this.client) {
      this.client.connectHeaders = { Authorization: normalizeToken(token) };
    }
  }

  notifyConnection(status, details = null) {
    this.onConnectionChange?.(status, details);
  }

  notifyError(error) {
    const callError =
      error instanceof CallClientError
        ? error
        : new CallClientError(error?.message || "A signaling error occurred.", {
            code: "signaling_error",
            cause: error,
          });
    this.onError?.(callError);
    return callError;
  }

  resolveConnectionWaiters() {
    this.connectionWaiters.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve(this);
    });
    this.connectionWaiters.clear();
  }

  rejectConnectionWaiters(error) {
    this.connectionWaiters.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(error);
    });
    this.connectionWaiters.clear();
  }

  waitForConnection(timeout = 15000) {
    if (this.connected) return Promise.resolve(this);

    return new Promise((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        timer: setTimeout(() => {
          this.connectionWaiters.delete(waiter);
          reject(
            new CallClientError("Call signaling did not reconnect in time.", {
              code: "signaling_connection_timeout",
            }),
          );
        }, timeout),
      };
      this.connectionWaiters.add(waiter);
    });
  }

  subscribe() {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch {
        // The broker already discarded subscriptions from the prior session.
      }
    });
    this.subscriptions = [];

    this.subscriptions.push(
      this.client.subscribe(CALLS_QUEUE, (frame) => {
        try {
          this.onSignal?.(normalizeCallSignal(frame.body));
        } catch (error) {
          this.notifyError(error);
        }
      }),
    );

    this.subscriptions.push(
      this.client.subscribe(ERRORS_QUEUE, (frame) => {
        this.notifyError(serverErrorFromFrame(frame));
      }),
    );
  }

  connect() {
    if (this.connected) return Promise.resolve(this);
    if (this.connectPromise) return this.connectPromise;
    if (this.active) return this.waitForConnection();

    const authorization = normalizeToken(this.token);
    if (!authorization) {
      return Promise.reject(
        new CallClientError("A bearer token is required for call signaling.", {
          code: "missing_call_token",
        }),
      );
    }

    this.manualDisconnect = false;
    this.notifyConnection("connecting");

    this.connectPromise = new Promise((resolve, reject) => {
      let initialConnectionSettled = false;

      const rejectInitialConnection = (error) => {
        if (initialConnectionSettled) return;
        initialConnectionSettled = true;
        const failedClient = this.client;
        this.client = null;
        this.connectPromise = null;
        this.cancelInitialConnection = null;
        if (failedClient?.active) {
          failedClient.reconnectDelay = 0;
          void failedClient.deactivate();
        }
        this.rejectConnectionWaiters(error);
        reject(error);
      };

      this.cancelInitialConnection = rejectInitialConnection;

      this.client = new Client({
        brokerURL: this.socketUrl,
        connectHeaders: { Authorization: authorization },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectionTimeout: 10000,
        discardWebsocketOnCommFailure: true,
        debug: this.debug ? (message) => console.debug(`[call-stomp] ${message}`) : () => {},
        onConnect: () => {
          try {
            this.subscribe();
            this.notifyConnection("connected");
            this.resolveConnectionWaiters();

            if (!initialConnectionSettled) {
              initialConnectionSettled = true;
              this.connectPromise = null;
              this.cancelInitialConnection = null;
              resolve(this);
            }
          } catch (error) {
            const callError = this.notifyError(error);
            rejectInitialConnection(callError);
          }
        },
        onStompError: (frame) => {
          const error = this.notifyError(serverErrorFromFrame(frame));
          this.notifyConnection("error", error);
          rejectInitialConnection(error);
        },
        onWebSocketError: (event) => {
          const error = this.notifyError(
            new CallClientError("The call signaling socket could not connect.", {
              code: "socket_error",
              details: event?.type || null,
            }),
          );
          this.notifyConnection("error", error);
          rejectInitialConnection(error);
        },
        onWebSocketClose: (event) => {
          if (this.manualDisconnect) {
            this.notifyConnection("disconnected");
            return;
          }

          this.notifyConnection(this.client?.active ? "reconnecting" : "disconnected", {
            code: event?.code,
            reason: event?.reason,
          });
        },
        onDisconnect: () => this.notifyConnection("disconnected"),
      });

      this.client.activate();
    });

    return this.connectPromise;
  }

  publishSignal(signal) {
    if (!this.connected) {
      throw new CallClientError("Call signaling is not connected.", {
        code: "signaling_not_connected",
      });
    }

    const body = normalizeOutgoingSignal(signal);
    this.client.publish({
      destination: SIGNAL_DESTINATION,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return body;
  }

  async disconnect() {
    this.manualDisconnect = true;
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch {
        // A closed STOMP session has already removed its subscriptions.
      }
    });
    this.subscriptions = [];

    const client = this.client;
    const disconnectError = new CallClientError("Call signaling was disconnected.", {
      code: "signaling_disconnected",
    });
    this.cancelInitialConnection?.(disconnectError);
    this.cancelInitialConnection = null;
    this.client = null;
    this.connectPromise = null;

    this.rejectConnectionWaiters(disconnectError);

    if (client?.active) await client.deactivate();
    this.notifyConnection("disconnected");
  }
}

export function createCallClient(options) {
  return new CallClient(options);
}
