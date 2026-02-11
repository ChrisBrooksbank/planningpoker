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

/**
 * Custom hook for managing WebSocket connection with automatic reconnection
 * Implements exponential backoff strategy for reconnection attempts
 */
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
  const shouldReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Build WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?roomId=${encodeURIComponent(roomId)}&userId=${encodeURIComponent(userId)}`;

    console.log("Connecting to WebSocket:", wsUrl);
    setIsConnecting(true);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setIsConnecting(false);
      setError(null); // Clear any previous errors
      reconnectDelayRef.current = WS_RECONNECT_INTERVAL; // Reset delay on successful connection
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage;
        console.log("WebSocket message received:", message);
        onMessage?.(message);
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error. Attempting to reconnect...");
      onError?.(error);
    };

    ws.onclose = (event) => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setIsConnecting(false);
      wsRef.current = null;
      onDisconnect?.();

      // Attempt reconnection if enabled
      if (shouldReconnectRef.current) {
        reconnectAttemptsRef.current++;

        // Check if this was an abnormal closure
        if (!event.wasClean) {
          setError(
            `Connection lost. Reconnecting (attempt ${reconnectAttemptsRef.current})...`
          );
        }

        console.log(`Reconnecting in ${reconnectDelayRef.current}ms...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          // Increase delay for next attempt (exponential backoff)
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * WS_RECONNECT_BACKOFF,
            WS_MAX_RECONNECT_INTERVAL
          );
          connect();
        }, reconnectDelayRef.current);
      }
    };
  }, [roomId, userId, onMessage, onConnect, onDisconnect, onError]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Cannot send message: WebSocket is not connected");
    }
  }, []);

  const reconnect = useCallback(() => {
    reconnectDelayRef.current = WS_RECONNECT_INTERVAL; // Reset delay
    reconnectAttemptsRef.current = 0; // Reset attempts
    setError(null); // Clear error
    connect();
  }, [connect]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial connection
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    clearError,
  };
}
