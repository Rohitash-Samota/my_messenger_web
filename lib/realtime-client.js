"use client";

import { Client } from "@stomp/stompjs";

import { resolveCallSocketUrl } from "@/lib/call-client";

export const CHAT_EVENTS_QUEUE = "/user/queue/events";
export const CHAT_ERRORS_QUEUE = "/user/queue/errors";

export class RealtimeError extends Error {
  constructor(message, { code = "realtime_error", details = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "RealtimeError";
    this.code = code;
    this.details = details;
  }
}

const authorizationHeader = (token) => {
  const value = String(token || "").trim();
  if (!value) return "";
  return value.toLowerCase().startsWith("bearer ") ? value : `Bearer ${value}`;
};

const parseBody = (body) => {
  if (!body) return null;
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch (cause) {
    throw new RealtimeError("The realtime server returned invalid JSON.", {
      code: "invalid_event_json",
      details: body.slice(0, 240),
      cause,
    });
  }
};

export function normalizeRealtimeEvent(value) {
  const source = parseBody(value);
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new RealtimeError("The realtime server returned an invalid event.", {
      code: "invalid_realtime_event",
      details: source,
    });
  }

  const payload = source.payload ?? source.data ?? source.message ?? {};
  const rawConversationId =
    source.conversationId ??
    source.conversionId ??
    payload?.conversationId ??
    payload?.conversionId ??
    null;
  const numericConversationId = Number(rawConversationId);

  return {
    type: String(source.type || source.eventType || source.event || "UNKNOWN").toUpperCase(),
    conversationId:
      Number.isInteger(numericConversationId) && numericConversationId > 0
        ? numericConversationId
        : rawConversationId,
    payload,
    occurredAt: source.occurredAt || source.createdAt || source.timestamp || new Date().toISOString(),
    id: source.id || source.eventId || null,
    raw: source,
  };
}

const errorFromFrame = (frame) => {
  let payload = null;
  try {
    payload = parseBody(frame?.body);
  } catch {
    payload = null;
  }

  return new RealtimeError(
    payload?.message || frame?.headers?.message || frame?.body || "Realtime messaging failed.",
    {
      code: payload?.code || "realtime_server_error",
      details: payload || frame?.headers || null,
    },
  );
};

export class RealtimeClient {
  constructor({
    token,
    socketUrl,
    apiBaseUrl,
    eventsQueue = CHAT_EVENTS_QUEUE,
    errorsQueue = CHAT_ERRORS_QUEUE,
    onEvent,
    onError,
    onConnectionChange,
    reconnectDelay = 3000,
    debug = false,
  } = {}) {
    this.token = token;
    this.socketUrl = resolveCallSocketUrl({ socketUrl, apiBaseUrl });
    this.eventsQueue = eventsQueue;
    this.errorsQueue = errorsQueue;
    this.onEvent = onEvent;
    this.onError = onError;
    this.onConnectionChange = onConnectionChange;
    this.reconnectDelay = reconnectDelay;
    this.debug = debug;
    this.client = null;
    this.subscriptions = [];
    this.manualDisconnect = false;
  }

  get connected() {
    return Boolean(this.client?.connected);
  }

  report(error) {
    const realtimeError =
      error instanceof RealtimeError
        ? error
        : new RealtimeError(error?.message || "Realtime messaging failed.", {
            cause: error,
          });
    this.onError?.(realtimeError);
    return realtimeError;
  }

  clearSubscriptions() {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch {
        // A disconnected broker has already removed the subscription.
      }
    });
    this.subscriptions = [];
  }

  subscribe() {
    this.clearSubscriptions();
    this.subscriptions.push(
      this.client.subscribe(this.eventsQueue, (frame) => {
        try {
          const result = this.onEvent?.(normalizeRealtimeEvent(frame.body));
          result?.catch?.((error) => this.report(error));
        } catch (error) {
          this.report(error);
        }
      }),
    );

    if (this.errorsQueue) {
      this.subscriptions.push(
        this.client.subscribe(this.errorsQueue, (frame) => this.report(errorFromFrame(frame))),
      );
    }
  }

  connect() {
    if (this.connected) return Promise.resolve(this);
    const authorization = authorizationHeader(this.token);
    if (!authorization) {
      return Promise.reject(
        new RealtimeError("A bearer token is required for realtime messaging.", {
          code: "missing_realtime_token",
        }),
      );
    }

    this.manualDisconnect = false;
    this.onConnectionChange?.("connecting");

    return new Promise((resolve, reject) => {
      let settled = false;
      const rejectInitial = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      this.client = new Client({
        brokerURL: this.socketUrl,
        connectHeaders: { Authorization: authorization },
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectionTimeout: 10000,
        discardWebsocketOnCommFailure: true,
        debug: this.debug ? (message) => console.debug(`[chat-stomp] ${message}`) : () => {},
        onConnect: () => {
          try {
            this.subscribe();
            this.onConnectionChange?.("connected");
            if (!settled) {
              settled = true;
              resolve(this);
            }
          } catch (error) {
            rejectInitial(this.report(error));
          }
        },
        onStompError: (frame) => {
          const error = this.report(errorFromFrame(frame));
          this.onConnectionChange?.("error", error);
          rejectInitial(error);
        },
        onWebSocketError: (event) => {
          const error = this.report(
            new RealtimeError("The realtime socket could not connect.", {
              code: "realtime_socket_error",
              details: event?.type || null,
            }),
          );
          this.onConnectionChange?.("error", error);
          rejectInitial(error);
        },
        onWebSocketClose: () => {
          this.onConnectionChange?.(
            this.manualDisconnect ? "disconnected" : this.client?.active ? "reconnecting" : "disconnected",
          );
        },
        onDisconnect: () => this.onConnectionChange?.("disconnected"),
      });
      this.client.activate();
    });
  }

  async disconnect() {
    this.manualDisconnect = true;
    this.clearSubscriptions();
    const client = this.client;
    this.client = null;
    if (client?.active) await client.deactivate();
    this.onConnectionChange?.("disconnected");
  }
}

export function createRealtimeClient(options) {
  return new RealtimeClient(options);
}
