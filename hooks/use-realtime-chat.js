"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createRealtimeClient } from "@/lib/realtime-client";

const messageEvents = new Set(["MESSAGE_CREATED", "MESSAGE_SENT", "NEW_MESSAGE"]);
const receiptEvents = new Set([
  "MESSAGE_STATE_CHANGED",
  "MESSAGE_DELIVERED",
  "MESSAGE_READ",
  "RECEIPT_UPDATED",
]);
const conversationEvents = new Set([
  "CONVERSATION_CREATED",
  "CONVERSATION_UPDATED",
  "CONVERSATION_CHANGED",
]);

export default function useRealtimeChat({
  token = "",
  enabled = true,
  socketUrl,
  apiBaseUrl,
  debug = false,
  onEvent,
  onMessage,
  onReceipt,
  onConversation,
  onError,
} = {}) {
  const cleanToken = String(token || "").trim();
  const [clientStatus, setClientStatus] = useState(
    cleanToken && enabled ? "disconnected" : "demo",
  );
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const [generation, setGeneration] = useState(0);
  const clientRef = useRef(null);
  const callbacksRef = useRef({ onEvent, onMessage, onReceipt, onConversation, onError });

  useEffect(() => {
    callbacksRef.current = { onEvent, onMessage, onReceipt, onConversation, onError };
  }, [onConversation, onError, onEvent, onMessage, onReceipt]);

  useEffect(() => {
    if (!enabled || !cleanToken) {
      return undefined;
    }

    let disposed = false;
    let client;
    try {
      client = createRealtimeClient({
        token: cleanToken,
        socketUrl,
        apiBaseUrl,
        debug,
        onConnectionChange: (status) => {
          if (!disposed && clientRef.current === client) setClientStatus(status);
        },
        onError: (realtimeError) => {
          if (disposed || clientRef.current !== client) return;
          setError(realtimeError);
          callbacksRef.current.onError?.(realtimeError);
        },
        onEvent: async (event) => {
          if (disposed || clientRef.current !== client) return;
          setLastEvent(event);
          setError(null);
          await callbacksRef.current.onEvent?.(event);
          if (messageEvents.has(event.type)) await callbacksRef.current.onMessage?.(event);
          else if (receiptEvents.has(event.type)) await callbacksRef.current.onReceipt?.(event);
          else if (conversationEvents.has(event.type)) {
            await callbacksRef.current.onConversation?.(event);
          }
        },
      });
    } catch (configurationError) {
      const timer = window.setTimeout(() => {
        if (disposed) return;
        setClientStatus("error");
        setError(configurationError);
        callbacksRef.current.onError?.(configurationError);
      }, 0);
      return () => {
        disposed = true;
        window.clearTimeout(timer);
      };
    }

    clientRef.current = client;
    void client.connect().catch((connectionError) => {
      if (disposed || clientRef.current !== client) return;
      setClientStatus("error");
      setError(connectionError);
    });

    return () => {
      disposed = true;
      if (clientRef.current === client) clientRef.current = null;
      void client.disconnect();
    };
  }, [apiBaseUrl, cleanToken, debug, enabled, generation, socketUrl]);

  const reconnect = useCallback(() => setGeneration((value) => value + 1), []);
  const disconnect = useCallback(async () => {
    const client = clientRef.current;
    clientRef.current = null;
    if (client) await client.disconnect();
    setClientStatus(cleanToken && enabled ? "disconnected" : "demo");
  }, [cleanToken, enabled]);

  const connectionStatus = enabled && cleanToken ? clientStatus : "demo";

  return {
    connectionStatus,
    isConnected: connectionStatus === "connected",
    lastEvent,
    error: connectionStatus === "demo" ? null : error,
    reconnect,
    disconnect,
  };
}
