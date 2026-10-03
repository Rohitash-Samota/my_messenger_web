"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CALL_MEDIA_TYPES,
  CALL_SIGNAL_TYPES,
  createCallClient,
} from "@/lib/call-client";

export const CALL_STATUSES = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  CALLING: "calling",
  RINGING: "ringing",
  CONNECTING: "connecting",
  RECONNECTING: "reconnecting",
  ACTIVE: "active",
  ENDED: "ended",
  ERROR: "error",
});

export const DEFAULT_ICE_SERVERS = Object.freeze([
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
]);

const liveStatuses = new Set([
  CALL_STATUSES.PREPARING,
  CALL_STATUSES.CALLING,
  CALL_STATUSES.RINGING,
  CALL_STATUSES.CONNECTING,
  CALL_STATUSES.RECONNECTING,
  CALL_STATUSES.ACTIVE,
]);

export class CallSessionError extends Error {
  constructor(message, { code = "call_session_error", cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = "CallSessionError";
    this.code = code;
  }
}

const makeCallId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

const normalizeMediaType = (mediaType) => {
  const normalized = String(mediaType || CALL_MEDIA_TYPES.AUDIO).toUpperCase();
  if (!Object.hasOwn(CALL_MEDIA_TYPES, normalized)) {
    throw new CallSessionError("mediaType must be AUDIO or VIDEO.", {
      code: "invalid_media_type",
    });
  }
  return normalized;
};

const normalizeConversationId = (conversationId) => {
  const normalized = Number(conversationId);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new CallSessionError("conversationId must be a positive integer.", {
      code: "invalid_conversation_id",
    });
  }
  return normalized;
};

const normalizeError = (error, fallbackCode = "call_failed") => {
  if (error instanceof Error) {
    if (!error.code) error.code = fallbackCode;
    return error;
  }

  return new CallSessionError(String(error || "The call could not be completed."), {
    code: fallbackCode,
  });
};

const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const attachStream = (element, stream, muted = false) => {
  if (!element) return;
  if (element.srcObject !== stream) element.srcObject = stream || null;
  element.muted = muted;
  element.playsInline = true;

  if (stream) {
    const playPromise = element.play?.();
    playPromise?.catch?.(() => {});
  }
};

/**
 * Manages a single one-to-one WebRTC call over the backend STOMP contract.
 */
export default function useCall({
  token = "",
  socketUrl,
  apiBaseUrl,
  iceServers = DEFAULT_ICE_SERVERS,
  audioConstraints = true,
  videoConstraints = { facingMode: "user" },
  debugSignaling = false,
  demoRingDelay = 550,
  demoAcceptDelay = 1450,
  onIncomingCall,
  onCallEnded,
  onError,
  onStatusChange,
} = {}) {
  const cleanToken = String(token || "").trim();
  const [call, setCall] = useState(null);
  const [status, setStatus] = useState(CALL_STATUSES.IDLE);
  const [connectionStatus, setConnectionStatus] = useState(cleanToken ? "disconnected" : "demo");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const callRef = useRef(null);
  const statusRef = useRef(CALL_STATUSES.IDLE);
  const tokenRef = useRef(cleanToken);
  const signalingRef = useRef(null);
  const connectionPromiseRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const demoTimersRef = useRef([]);
  const mutedRef = useRef(false);
  const cameraOffRef = useRef(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const finishCallRef = useRef(null);
  const reportErrorRef = useRef(null);
  const mediaConfigRef = useRef({
    iceServers,
    audioConstraints,
    videoConstraints,
  });
  const callbacksRef = useRef({
    onIncomingCall,
    onCallEnded,
    onError,
    onStatusChange,
  });

  useEffect(() => {
    callbacksRef.current = { onIncomingCall, onCallEnded, onError, onStatusChange };
  }, [onCallEnded, onError, onIncomingCall, onStatusChange]);

  useEffect(() => {
    mediaConfigRef.current = { iceServers, audioConstraints, videoConstraints };
  }, [audioConstraints, iceServers, videoConstraints]);

  const updateCall = useCallback((value) => {
    const nextCall = typeof value === "function" ? value(callRef.current) : value;
    callRef.current = nextCall;
    if (mountedRef.current) setCall(nextCall);
    return nextCall;
  }, []);

  const updateStatus = useCallback((nextStatus) => {
    statusRef.current = nextStatus;
    if (mountedRef.current) setStatus(nextStatus);
    callbacksRef.current.onStatusChange?.(nextStatus, callRef.current);
  }, []);

  const updateConnectionStatus = useCallback((nextStatus) => {
    if (mountedRef.current) setConnectionStatus(nextStatus);
  }, []);

  const clearDemoTimers = useCallback(() => {
    demoTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    demoTimersRef.current = [];
  }, []);

  const closePeerConnection = useCallback(() => {
    const peer = peerRef.current;
    peerRef.current = null;
    pendingCandidatesRef.current = [];

    if (!peer) return;
    peer.onicecandidate = null;
    peer.ontrack = null;
    peer.onconnectionstatechange = null;
    peer.oniceconnectionstatechange = null;
    if (peer.signalingState !== "closed") peer.close();
  }, []);

  const releaseCallMedia = useCallback(() => {
    closePeerConnection();
    clearDemoTimers();

    stopStream(localStreamRef.current);
    stopStream(remoteStreamRef.current);
    localStreamRef.current = null;
    remoteStreamRef.current = null;

    attachStream(localVideoRef.current, null, true);
    attachStream(remoteVideoRef.current, null);

    mutedRef.current = false;
    cameraOffRef.current = false;
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsCameraOff(false);
    }
  }, [clearDemoTimers, closePeerConnection]);

  const reportError = useCallback(
    (value, { fatal = false, code = "call_failed" } = {}) => {
      const callError = normalizeError(value, code);
      if (mountedRef.current) setError(callError);
      if (fatal) updateStatus(CALL_STATUSES.ERROR);
      callbacksRef.current.onError?.(callError, callRef.current);
      return callError;
    },
    [updateStatus],
  );

  const publishSignal = useCallback((type, { session, sdp = null, candidate = null } = {}) => {
    const activeCall = session || callRef.current;
    if (!activeCall) {
      throw new CallSessionError("There is no active call.", { code: "no_active_call" });
    }

    if (!tokenRef.current || activeCall.demo) return null;

    const client = signalingRef.current;
    if (!client?.connected) {
      throw new CallSessionError("Call signaling is not connected.", {
        code: "signaling_not_connected",
      });
    }

    return client.publishSignal({
      callId: activeCall.callId,
      conversationId: activeCall.conversationId,
      type,
      mediaType: activeCall.mediaType,
      sdp,
      candidate,
    });
  }, []);

  const finishCall = useCallback(
    ({ reason = "ended", signalType = null } = {}) => {
      const endedCall = callRef.current;
      if (!endedCall || statusRef.current === CALL_STATUSES.ENDED) return endedCall;

      if (signalType && tokenRef.current) {
        try {
          publishSignal(signalType, { session: endedCall });
        } catch (signalError) {
          reportError(signalError, { code: "hangup_signal_failed" });
        }
      }

      releaseCallMedia();
      const completedCall = {
        ...endedCall,
        endedAt: new Date().toISOString(),
        endReason: reason,
      };
      updateCall(completedCall);
      updateStatus(CALL_STATUSES.ENDED);
      callbacksRef.current.onCallEnded?.(completedCall, reason);
      return completedCall;
    },
    [publishSignal, releaseCallMedia, reportError, updateCall, updateStatus],
  );

  useEffect(() => {
    finishCallRef.current = finishCall;
    reportErrorRef.current = reportError;
  }, [finishCall, reportError]);

  const acquireLocalMedia = useCallback(async (mediaType, expectedCallId) => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new CallSessionError("This browser does not support camera or microphone access.", {
        code: "media_not_supported",
      });
    }

    const existingStream = localStreamRef.current;
    const hasAudio = Boolean(existingStream?.getAudioTracks().length);
    const hasVideo = Boolean(existingStream?.getVideoTracks().length);
    if (existingStream && hasAudio && (mediaType === CALL_MEDIA_TYPES.AUDIO || hasVideo)) {
      return existingStream;
    }

    stopStream(existingStream);
    const config = mediaConfigRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: config.audioConstraints,
      video: mediaType === CALL_MEDIA_TYPES.VIDEO ? config.videoConstraints : false,
    });

    if (
      callRef.current?.callId !== expectedCallId ||
      !liveStatuses.has(statusRef.current)
    ) {
      stopStream(stream);
      throw new CallSessionError("The call ended before media became available.", {
        code: "call_cancelled",
      });
    }

    localStreamRef.current = stream;
    mutedRef.current = false;
    cameraOffRef.current = false;
    if (mountedRef.current) {
      setLocalStream(stream);
      setIsMuted(false);
      setIsCameraOff(false);
    }
    attachStream(localVideoRef.current, stream, true);
    return stream;
  }, []);

  const flushPendingCandidates = useCallback(async (peer) => {
    if (!peer.remoteDescription) return;

    const candidates = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of candidates) {
      await peer.addIceCandidate(candidate);
    }
  }, []);

  const ensurePeerConnection = useCallback(
    (session = callRef.current) => {
      if (peerRef.current && peerRef.current.signalingState !== "closed") {
        return peerRef.current;
      }

      if (typeof RTCPeerConnection === "undefined") {
        throw new CallSessionError("This browser does not support WebRTC calls.", {
          code: "webrtc_not_supported",
        });
      }

      const peer = new RTCPeerConnection({
        iceServers: mediaConfigRef.current.iceServers,
      });
      peerRef.current = peer;

      localStreamRef.current?.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });

      peer.onicecandidate = ({ candidate }) => {
        if (!candidate || callRef.current?.callId !== session.callId) return;

        try {
          publishSignal(CALL_SIGNAL_TYPES.ICE_CANDIDATE, {
            session,
            candidate: candidate.toJSON?.() || candidate,
          });
        } catch (signalError) {
          reportErrorRef.current?.(signalError, { code: "ice_signal_failed" });
        }
      };

      peer.ontrack = (event) => {
        if (callRef.current?.callId !== session.callId) return;

        let stream = event.streams?.[0];
        if (!stream) {
          stream = remoteStreamRef.current || new MediaStream();
          if (!stream.getTracks().some((track) => track.id === event.track.id)) {
            stream.addTrack(event.track);
          }
        }

        remoteStreamRef.current = stream;
        if (mountedRef.current) setRemoteStream(stream);
        attachStream(remoteVideoRef.current, stream);
      };

      const handleConnectionState = () => {
        if (callRef.current?.callId !== session.callId) return;

        if (peer.connectionState === "connected") {
          updateCall((current) =>
            current
              ? { ...current, connectedAt: current.connectedAt || new Date().toISOString() }
              : current,
          );
          updateStatus(CALL_STATUSES.ACTIVE);
        } else if (peer.connectionState === "disconnected") {
          updateStatus(CALL_STATUSES.RECONNECTING);
        } else if (peer.connectionState === "failed") {
          reportErrorRef.current?.(
            new CallSessionError("The peer-to-peer connection failed.", {
              code: "peer_connection_failed",
            }),
          );
          finishCallRef.current?.({
            reason: "connection-failed",
            signalType: CALL_SIGNAL_TYPES.HANGUP,
          });
        }
      };

      peer.onconnectionstatechange = handleConnectionState;
      peer.oniceconnectionstatechange = () => {
        if (peer.iceConnectionState === "failed") handleConnectionState();
      };

      return peer;
    },
    [publishSignal, updateCall, updateStatus],
  );

  const createAndSendOffer = useCallback(
    async (session) => {
      const peer = ensurePeerConnection(session);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      if (
        callRef.current?.callId !== session.callId ||
        !liveStatuses.has(statusRef.current)
      ) {
        return false;
      }
      publishSignal(CALL_SIGNAL_TYPES.OFFER, {
        session,
        sdp: peer.localDescription?.sdp || offer.sdp,
      });
      updateStatus(CALL_STATUSES.CONNECTING);
      return true;
    },
    [ensurePeerConnection, publishSignal, updateStatus],
  );

  const acceptRemoteOffer = useCallback(
    async (session, sdp) => {
      if (!sdp) {
        throw new CallSessionError("The incoming WebRTC offer did not include SDP.", {
          code: "missing_offer_sdp",
        });
      }

      const peer = ensurePeerConnection(session);
      await peer.setRemoteDescription({ type: "offer", sdp });
      await flushPendingCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      if (
        callRef.current?.callId !== session.callId ||
        !liveStatuses.has(statusRef.current)
      ) {
        return false;
      }
      publishSignal(CALL_SIGNAL_TYPES.ANSWER, {
        session,
        sdp: peer.localDescription?.sdp || answer.sdp,
      });
      updateStatus(CALL_STATUSES.CONNECTING);
      return true;
    },
    [ensurePeerConnection, flushPendingCandidates, publishSignal, updateStatus],
  );

  const acceptRemoteAnswer = useCallback(
    async (sdp) => {
      if (!sdp) {
        throw new CallSessionError("The WebRTC answer did not include SDP.", {
          code: "missing_answer_sdp",
        });
      }

      const peer = peerRef.current;
      if (!peer) {
        throw new CallSessionError("The WebRTC peer is not ready for an answer.", {
          code: "peer_not_ready",
        });
      }

      await peer.setRemoteDescription({ type: "answer", sdp });
      await flushPendingCandidates(peer);
    },
    [flushPendingCandidates],
  );

  const addRemoteCandidate = useCallback(async (candidate) => {
    if (!candidate?.candidate) return;

    const peer = peerRef.current;
    if (!peer?.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    await peer.addIceCandidate(candidate);
  }, []);

  const handleSignal = useCallback(
    async (signal) => {
      if (signal.type === CALL_SIGNAL_TYPES.INVITE) {
        const currentCall = callRef.current;
        if (currentCall && liveStatuses.has(statusRef.current)) {
          publishSignal(CALL_SIGNAL_TYPES.BUSY, {
            session: {
              callId: signal.callId,
              conversationId: signal.conversationId,
              mediaType: signal.mediaType || CALL_MEDIA_TYPES.AUDIO,
            },
          });
          return;
        }

        releaseCallMedia();
        if (mountedRef.current) setError(null);
        const incomingCall = {
          callId: signal.callId,
          conversationId: signal.conversationId,
          mediaType: signal.mediaType || CALL_MEDIA_TYPES.AUDIO,
          direction: "incoming",
          senderUserId: signal.senderUserId,
          sender: signal.sender,
          sentAt: signal.sentAt,
          startedAt: signal.sentAt || new Date().toISOString(),
          connectedAt: null,
          endedAt: null,
          endReason: null,
          demo: false,
        };
        updateCall(incomingCall);
        updateStatus(CALL_STATUSES.RINGING);
        publishSignal(CALL_SIGNAL_TYPES.RINGING, { session: incomingCall });
        callbacksRef.current.onIncomingCall?.(incomingCall);
        return;
      }

      const activeCall = callRef.current;
      if (!activeCall || activeCall.callId !== signal.callId) return;

      switch (signal.type) {
        case CALL_SIGNAL_TYPES.RINGING:
          if (activeCall.direction === "outgoing") updateStatus(CALL_STATUSES.RINGING);
          break;
        case CALL_SIGNAL_TYPES.ACCEPT:
          if (activeCall.direction === "outgoing") {
            updateStatus(CALL_STATUSES.CONNECTING);
            await createAndSendOffer(activeCall);
          }
          break;
        case CALL_SIGNAL_TYPES.REJECT:
          finishCall({ reason: "rejected" });
          break;
        case CALL_SIGNAL_TYPES.BUSY:
          finishCall({ reason: "busy" });
          break;
        case CALL_SIGNAL_TYPES.OFFER:
          if (activeCall.direction === "incoming") {
            await acceptRemoteOffer(activeCall, signal.sdp);
          }
          break;
        case CALL_SIGNAL_TYPES.ANSWER:
          if (activeCall.direction === "outgoing") await acceptRemoteAnswer(signal.sdp);
          break;
        case CALL_SIGNAL_TYPES.ICE_CANDIDATE:
          await addRemoteCandidate(signal.candidate);
          break;
        case CALL_SIGNAL_TYPES.HANGUP:
          finishCall({ reason: "remote-hangup" });
          break;
        default:
          break;
      }
    },
    [
      acceptRemoteAnswer,
      acceptRemoteOffer,
      addRemoteCandidate,
      createAndSendOffer,
      finishCall,
      publishSignal,
      releaseCallMedia,
      updateCall,
      updateStatus,
    ],
  );

  useEffect(() => {
    tokenRef.current = cleanToken;

    if (!cleanToken) {
      signalingRef.current = null;
      connectionPromiseRef.current = null;
      updateConnectionStatus("demo");
      return undefined;
    }

    let disposed = false;
    let client;
    try {
      client = createCallClient({
        token: cleanToken,
        socketUrl,
        apiBaseUrl,
        debug: debugSignaling,
        onSignal: (signal) => {
          void handleSignal(signal).catch((signalError) => {
            finishCall({
              reason: "signal-error",
              signalType: CALL_SIGNAL_TYPES.HANGUP,
            });
            reportError(signalError, { fatal: true, code: "signal_handling_failed" });
          });
        },
        onError: (signalError) => reportError(signalError, { code: "signaling_error" }),
        onConnectionChange: (nextStatus) => {
          if (!disposed && signalingRef.current === client) {
            updateConnectionStatus(nextStatus);
          }
        },
      });
    } catch (configurationError) {
      updateConnectionStatus("error");
      reportError(configurationError, { code: "signaling_configuration_failed" });
      return undefined;
    }

    signalingRef.current = client;
    const connectionPromise = client.connect();
    connectionPromiseRef.current = connectionPromise;
    void connectionPromise
      .catch((connectionError) => {
        if (!disposed && signalingRef.current === client) {
          reportError(connectionError, { code: "signaling_connection_failed" });
        }
      })
      .finally(() => {
        if (connectionPromiseRef.current === connectionPromise) {
          connectionPromiseRef.current = null;
        }
      });

    return () => {
      disposed = true;
      if (signalingRef.current === client) signalingRef.current = null;
      if (connectionPromiseRef.current === connectionPromise) connectionPromiseRef.current = null;
      void client.disconnect();
    };
  }, [
    apiBaseUrl,
    cleanToken,
    debugSignaling,
    finishCall,
    handleSignal,
    reportError,
    socketUrl,
    updateConnectionStatus,
  ]);

  const waitForSignaling = useCallback(async () => {
    const client = signalingRef.current;
    if (!tokenRef.current || !client) {
      throw new CallSessionError("Call signaling is not configured.", {
        code: "signaling_not_configured",
      });
    }

    if (client.connected) return client;
    if (connectionPromiseRef.current) await connectionPromiseRef.current;
    else await client.connect();

    if (!client.connected) {
      throw new CallSessionError("Call signaling is not connected.", {
        code: "signaling_not_connected",
      });
    }
    return client;
  }, []);

  const scheduleDemoTransition = useCallback((callId, delay, callback) => {
    const timer = window.setTimeout(() => {
      demoTimersRef.current = demoTimersRef.current.filter((entry) => entry !== timer);
      if (mountedRef.current && callRef.current?.callId === callId) callback();
    }, delay);
    demoTimersRef.current.push(timer);
  }, []);

  const startCall = useCallback(
    async ({ conversationId, mediaType = CALL_MEDIA_TYPES.AUDIO } = {}) => {
      if (callRef.current && liveStatuses.has(statusRef.current)) {
        throw new CallSessionError("Another call is already in progress.", {
          code: "call_in_progress",
        });
      }

      const normalizedConversationId = normalizeConversationId(conversationId);
      const normalizedMediaType = normalizeMediaType(mediaType);
      releaseCallMedia();
      if (mountedRef.current) setError(null);

      const outgoingCall = {
        callId: makeCallId(),
        conversationId: normalizedConversationId,
        mediaType: normalizedMediaType,
        direction: "outgoing",
        senderUserId: null,
        sender: null,
        sentAt: null,
        startedAt: new Date().toISOString(),
        connectedAt: null,
        endedAt: null,
        endReason: null,
        demo: !tokenRef.current,
      };
      updateCall(outgoingCall);
      updateStatus(CALL_STATUSES.PREPARING);

      try {
        await acquireLocalMedia(normalizedMediaType, outgoingCall.callId);

        if (outgoingCall.demo) {
          updateStatus(CALL_STATUSES.CALLING);
          scheduleDemoTransition(outgoingCall.callId, demoRingDelay, () => {
            updateStatus(CALL_STATUSES.RINGING);
          });
          scheduleDemoTransition(outgoingCall.callId, demoAcceptDelay, () => {
            updateCall((current) => ({
              ...current,
              connectedAt: new Date().toISOString(),
            }));
            updateStatus(CALL_STATUSES.ACTIVE);
          });
          return outgoingCall;
        }

        await waitForSignaling();
        if (
          callRef.current?.callId !== outgoingCall.callId ||
          !liveStatuses.has(statusRef.current)
        ) {
          return null;
        }
        publishSignal(CALL_SIGNAL_TYPES.INVITE, { session: outgoingCall });
        updateStatus(CALL_STATUSES.CALLING);
        return outgoingCall;
      } catch (startError) {
        releaseCallMedia();
        if (startError?.code === "call_cancelled") return null;
        throw reportError(startError, { fatal: true, code: "call_start_failed" });
      }
    },
    [
      acquireLocalMedia,
      demoAcceptDelay,
      demoRingDelay,
      publishSignal,
      releaseCallMedia,
      reportError,
      scheduleDemoTransition,
      updateCall,
      updateStatus,
      waitForSignaling,
    ],
  );

  const acceptCall = useCallback(async () => {
    const incomingCall = callRef.current;
    if (
      !incomingCall ||
      incomingCall.direction !== "incoming" ||
      statusRef.current !== CALL_STATUSES.RINGING
    ) {
      throw new CallSessionError("There is no incoming call to accept.", {
        code: "no_incoming_call",
      });
    }

    updateStatus(CALL_STATUSES.CONNECTING);
    try {
      await acquireLocalMedia(incomingCall.mediaType, incomingCall.callId);

      if (incomingCall.demo) {
        updateCall((current) => ({
          ...current,
          connectedAt: new Date().toISOString(),
        }));
        updateStatus(CALL_STATUSES.ACTIVE);
        return true;
      }

      await waitForSignaling();
      if (
        callRef.current?.callId !== incomingCall.callId ||
        !liveStatuses.has(statusRef.current)
      ) {
        return false;
      }
      publishSignal(CALL_SIGNAL_TYPES.ACCEPT, { session: incomingCall });
      return true;
    } catch (acceptError) {
      releaseCallMedia();
      if (acceptError?.code === "call_cancelled") return false;
      throw reportError(acceptError, { fatal: true, code: "call_accept_failed" });
    }
  }, [
    acquireLocalMedia,
    publishSignal,
    releaseCallMedia,
    reportError,
    updateCall,
    updateStatus,
    waitForSignaling,
  ]);

  const rejectCall = useCallback(
    (reason = "rejected") => {
      const incomingCall = callRef.current;
      if (
        !incomingCall ||
        incomingCall.direction !== "incoming" ||
        statusRef.current !== CALL_STATUSES.RINGING
      ) {
        return false;
      }

      if (tokenRef.current) {
        try {
          publishSignal(CALL_SIGNAL_TYPES.REJECT, { session: incomingCall });
        } catch (signalError) {
          reportError(signalError, { code: "reject_signal_failed" });
        }
      }
      finishCall({ reason });
      return true;
    },
    [finishCall, publishSignal, reportError],
  );

  const hangUp = useCallback(
    (reason = "local-hangup") => {
      if (!callRef.current || !liveStatuses.has(statusRef.current)) return false;
      finishCall({ reason, signalType: CALL_SIGNAL_TYPES.HANGUP });
      return true;
    },
    [finishCall],
  );

  const toggleMute = useCallback(() => {
    const tracks = localStreamRef.current?.getAudioTracks() || [];
    if (!tracks.length) return mutedRef.current;

    const nextMuted = !mutedRef.current;
    tracks.forEach((track) => {
      track.enabled = !nextMuted;
    });
    mutedRef.current = nextMuted;
    if (mountedRef.current) setIsMuted(nextMuted);
    return nextMuted;
  }, []);

  const toggleCamera = useCallback(() => {
    const tracks = localStreamRef.current?.getVideoTracks() || [];
    if (!tracks.length) return cameraOffRef.current;

    const nextCameraOff = !cameraOffRef.current;
    tracks.forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    cameraOffRef.current = nextCameraOff;
    if (mountedRef.current) setIsCameraOff(nextCameraOff);
    return nextCameraOff;
  }, []);

  const resetCall = useCallback(() => {
    releaseCallMedia();
    updateCall(null);
    updateStatus(CALL_STATUSES.IDLE);
    if (mountedRef.current) setError(null);
  }, [releaseCallMedia, updateCall, updateStatus]);

  const simulateIncomingCall = useCallback(
    ({ conversationId, mediaType = CALL_MEDIA_TYPES.AUDIO, sender = null } = {}) => {
      if (tokenRef.current) {
        throw new CallSessionError("Incoming calls can only be simulated without a token.", {
          code: "demo_mode_required",
        });
      }
      if (callRef.current && liveStatuses.has(statusRef.current)) return null;

      const demoCall = {
        callId: makeCallId(),
        conversationId: normalizeConversationId(conversationId),
        mediaType: normalizeMediaType(mediaType),
        direction: "incoming",
        senderUserId: sender?.id ?? null,
        sender,
        sentAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        connectedAt: null,
        endedAt: null,
        endReason: null,
        demo: true,
      };
      releaseCallMedia();
      if (mountedRef.current) setError(null);
      updateCall(demoCall);
      updateStatus(CALL_STATUSES.RINGING);
      callbacksRef.current.onIncomingCall?.(demoCall);
      return demoCall;
    },
    [releaseCallMedia, updateCall, updateStatus],
  );

  useEffect(() => {
    attachStream(localVideoRef.current, localStream, true);
  }, [localStream]);

  useEffect(() => {
    attachStream(remoteVideoRef.current, remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseCallMedia();
    };
  }, [releaseCallMedia]);

  return {
    call,
    status,
    connectionStatus,
    error,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCameraOff,
    isDemo: connectionStatus === "demo",
    isIncoming: call?.direction === "incoming",
    isActive: status === CALL_STATUSES.ACTIVE,
    startCall,
    acceptCall,
    rejectCall,
    hangUp,
    toggleMute,
    toggleCamera,
    resetCall,
    simulateIncomingCall,
  };
}
