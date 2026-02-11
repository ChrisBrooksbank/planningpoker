"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  WS_RECONNECT_INTERVAL,
  WS_MAX_RECONNECT_INTERVAL,
  WS_RECONNECT_BACKOFF,
} from "@/lib/constants";
import type { ClientMessage, ServerMessage } from "@/lib/websocket-messages";

export interface WebSocketHookOptions {
  roomId: string;
  userId: string;
  onMessage?: (message: ServerMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export interface WebSocketHookResult {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: ClientMessage) => void;
  reconnect: () => void;
  clearError: () => void;
}

export function useWebSocket({
  roomId,
  userId,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: WebSocketHookOptions): WebSocketHookResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(WS_RECONNECT_INTERVAL);
  const reconnectAttemptsRef = useRef(0);
  // Track the current effect cycle to detect stale closures
  const mountedRef = useRef(false);

  // Store all mutable values in refs so connect() has zero dependencies
  const roomIdRef = useRef(roomId);
  const userIdRef = useRef(userId);
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  roomIdRef.current = roomId;
  userIdRef.current = userId;
  onMessageRef.current = onMessage;
  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;

  // connect reads everything from refs — no dependencies, stable reference
  const connect = useCallback(() => {
    const currentRoomId = roomIdRef.current;
    const currentUserId = userIdRef.current;

    if (!currentRoomId || !currentUserId) return;
    if (!mountedRef.current) return;

    // Clean up existing connection
    if (wsRef.current) {
      const old = wsRef.current;
      wsRef.current = null;
      old.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?roomId=${encodeURIComponent(currentRoomId)}&userId=${encodeURIComponent(currentUserId)}`;

    setIsConnecting(true);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      reconnectDelayRef.current = WS_RECONNECT_INTERVAL;
      reconnectAttemptsRef.current = 0;
      onConnectRef.current?.();
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        onMessageRef.current?.(message);
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (evt) => {
      if (wsRef.current !== ws) return;
      console.error("WebSocket error:", evt);
      setError("Connection error. Attempting to reconnect...");
      onErrorRef.current?.(evt);
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;
      onDisconnectRef.current?.();

      if (mountedRef.current) {
        reconnectAttemptsRef.current++;
        setError(
          `Connection lost. Reconnecting (attempt ${reconnectAttemptsRef.current})...`
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * WS_RECONNECT_BACKOFF,
            WS_MAX_RECONNECT_INTERVAL
          );
          connect();
        }, reconnectDelayRef.current);
      }
    };
  }, []); // no dependencies — reads from refs

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket is not connected");
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectDelayRef.current = WS_RECONNECT_INTERVAL;
    reconnectAttemptsRef.current = 0;
    setError(null);
    connect();
  }, [connect]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Single effect keyed on roomId + userId
  useEffect(() => {
    if (!roomId || !userId) return;

    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        ws.close();
      }
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [roomId, userId, connect]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    clearError,
  };
}
