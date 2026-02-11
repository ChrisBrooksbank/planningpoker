import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebSocket } from "@/lib/hooks/useWebSocket";
import {
  WS_RECONNECT_INTERVAL,
  WS_MAX_RECONNECT_INTERVAL,
  WS_RECONNECT_BACKOFF,
} from "@/lib/constants";

// Track all created WebSocket instances
let wsInstances: MockWebSocket[] = [];

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this);
    // Simulate async connection
    setTimeout(() => {
      if (this.readyState === MockWebSocket.CONNECTING) {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event("open"));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error("WebSocket is not open");
    }
  }

  close() {
    if (this.readyState !== MockWebSocket.CLOSED) {
      this.readyState = MockWebSocket.CLOSED;
      setTimeout(() => {
        this.onclose?.(new CloseEvent("close"));
      }, 0);
    }
  }
}

// Store original WebSocket
const OriginalWebSocket = global.WebSocket;

describe("useWebSocket", () => {
  beforeEach(() => {
    wsInstances = [];
    // Mock WebSocket
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        protocol: "http:",
        host: "localhost:3000",
      },
      writable: true,
      configurable: true,
    });
    // Clear timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.WebSocket = OriginalWebSocket;
    vi.useRealTimers();
    wsInstances = [];
  });

  it("should establish WebSocket connection on mount", async () => {
    const onConnect = vi.fn();
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
        onConnect,
      })
    );

    expect(result.current.isConnected).toBe(false);

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("should build correct WebSocket URL with query params", async () => {
    renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Check the WebSocket was created with correct URL
    expect(wsInstances.length).toBeGreaterThan(0);
    expect(wsInstances[0].url).toContain("/ws?roomId=TEST123&userId=user1");
  });

  it("should handle incoming messages", async () => {
    const onMessage = vi.fn();
    renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
        onMessage,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Get the WebSocket instance
    const ws = wsInstances[wsInstances.length - 1];

    // Simulate receiving a message
    await act(async () => {
      const messageEvent = new MessageEvent("message", {
        data: JSON.stringify({ type: "test", data: "hello" }),
      });
      ws.onmessage?.(messageEvent);
    });

    expect(onMessage).toHaveBeenCalledWith({ type: "test", data: "hello" });
  });

  it("should send messages when connected", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];
    const sendSpy = vi.spyOn(ws, "send");

    act(() => {
      result.current.sendMessage({ type: "submit-vote", value: "5" });
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({ type: "submit-vote", value: "5" })
    );
  });

  it("should not send messages when disconnected", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Try to send before connection
    act(() => {
      result.current.sendMessage({ type: "submit-vote", value: "5" });
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      "Cannot send message: WebSocket is not connected"
    );

    consoleSpy.mockRestore();
  });

  it("should use correct reconnection constants", () => {
    // Verify reconnection constants are defined
    expect(WS_RECONNECT_INTERVAL).toBe(1000);
    expect(WS_MAX_RECONNECT_INTERVAL).toBe(30000);
    expect(WS_RECONNECT_BACKOFF).toBe(1.5);
  });

  it("should cleanup on unmount", async () => {
    const { unmount } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];
    const closeSpy = vi.spyOn(ws, "close");

    unmount();

    expect(closeSpy).toHaveBeenCalled();
  });

  it("should use wss protocol for https connections", async () => {
    // Mock https location
    Object.defineProperty(window, "location", {
      value: {
        protocol: "https:",
        host: "example.com",
      },
      writable: true,
      configurable: true,
    });

    renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    // Check protocol in URL
    expect(wsInstances[wsInstances.length - 1].url).toContain("wss://");
  });

  it("should handle malformed JSON messages gracefully", async () => {
    const onMessage = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
        onMessage,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Simulate receiving malformed JSON
    await act(async () => {
      const messageEvent = new MessageEvent("message", {
        data: "invalid json {{{",
      });
      ws.onmessage?.(messageEvent);
    });

    expect(onMessage).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to parse WebSocket message:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should provide reconnect function", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(typeof result.current.reconnect).toBe("function");
  });

  it("should expose isConnected state", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    expect(result.current.isConnected).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it("should call onConnect callback on successful connection", async () => {
    const onConnect = vi.fn();
    renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
        onConnect,
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("should expose isConnecting state initially true", () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    // Initially, should be connecting
    expect(result.current.isConnecting).toBe(true);
    expect(result.current.isConnected).toBe(false);
  });

  it("should set isConnecting to false once connected", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    expect(result.current.isConnecting).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnecting).toBe(false);
    expect(result.current.isConnected).toBe(true);
  });

  it("should set isConnecting to false on connection close", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.isConnecting).toBe(false);

    const ws = wsInstances[wsInstances.length - 1];

    // Close the connection
    await act(async () => {
      ws.close();
      vi.advanceTimersByTime(10);
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });

  it("should expose error state initially null", () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    expect(result.current.error).toBeNull();
  });

  it("should set error message on WebSocket error", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Trigger an error
    await act(async () => {
      ws.onerror?.(new Event("error"));
    });

    expect(result.current.error).toBe(
      "Connection error. Attempting to reconnect..."
    );
  });

  it("should clear error on successful connection", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Trigger an error
    await act(async () => {
      ws.onerror?.(new Event("error"));
    });

    expect(result.current.error).toBe(
      "Connection error. Attempting to reconnect..."
    );

    // Close and reconnect
    await act(async () => {
      ws.close();
      vi.advanceTimersByTime(10);
    });

    // Wait for reconnection
    await act(async () => {
      vi.advanceTimersByTime(1020);
    });

    // Error should be cleared on successful reconnection
    expect(result.current.error).toBeNull();
  });

  it("should provide clearError function", () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    expect(typeof result.current.clearError).toBe("function");
  });

  it("should clear error when clearError is called", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Trigger an error
    await act(async () => {
      ws.onerror?.(new Event("error"));
    });

    expect(result.current.error).not.toBeNull();

    // Clear error manually
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it("should set error message on abnormal connection close", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Close with abnormal closure
    await act(async () => {
      const closeEvent = new CloseEvent("close", { wasClean: false });
      ws.onclose?.(closeEvent);
      vi.advanceTimersByTime(10);
    });

    expect(result.current.error).toContain("Connection lost. Reconnecting");
  });

  it("should include attempt number in reconnection error message", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Abnormal close should show attempt number
    await act(async () => {
      const closeEvent = new CloseEvent("close", { wasClean: false });
      ws.onclose?.(closeEvent);
      vi.advanceTimersByTime(10);
    });

    // Error should contain "attempt X" pattern
    expect(result.current.error).toMatch(/attempt \d+/);
    expect(result.current.error).toContain("Connection lost. Reconnecting");
  });

  it("should reset reconnection attempts on manual reconnect", async () => {
    const { result } = renderHook(() =>
      useWebSocket({
        roomId: "TEST123",
        userId: "user1",
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws = wsInstances[wsInstances.length - 1];

    // Close abnormally multiple times
    await act(async () => {
      const closeEvent = new CloseEvent("close", { wasClean: false });
      ws.onclose?.(closeEvent);
      vi.advanceTimersByTime(10);
    });

    // Manual reconnect should reset attempts
    act(() => {
      result.current.reconnect();
    });

    expect(result.current.error).toBeNull();

    // Wait for connection
    await act(async () => {
      vi.advanceTimersByTime(20);
    });

    const ws2 = wsInstances[wsInstances.length - 1];

    // Next close should be attempt 1, not 2
    await act(async () => {
      const closeEvent = new CloseEvent("close", { wasClean: false });
      ws2.onclose?.(closeEvent);
      vi.advanceTimersByTime(10);
    });

    expect(result.current.error).toContain("attempt 1");
  });
});
