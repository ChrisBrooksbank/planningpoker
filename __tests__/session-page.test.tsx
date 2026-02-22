import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams } from "next/navigation";
import SessionPage from "@/app/session/[roomId]/page";
import { useWebSocket } from "@/lib/hooks/useWebSocket";

// Mock Next.js navigation hooks
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
}));

// Mock useWebSocket hook
vi.mock("@/lib/hooks/useWebSocket", () => ({
  useWebSocket: vi.fn(),
}));

describe("SessionPage", () => {
  const mockSendMessage = vi.fn();
  const mockReconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useParams as ReturnType<typeof vi.fn>).mockReturnValue({
      roomId: "TEST123",
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it("should show join form if no userId in localStorage", async () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Join Planning Poker")).toBeInTheDocument();
      expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
      expect(screen.getByText("Enter Room")).toBeInTheDocument();
    });
  });

  it("should show join form if no participantName in localStorage", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Join Planning Poker")).toBeInTheDocument();
    });
  });

  it("should show join form with room code", () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    render(<SessionPage />);

    expect(screen.getByText("TEST123")).toBeInTheDocument();
  });

  it("should show validation error for empty name on join form", async () => {
    const user = userEvent.setup();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    render(<SessionPage />);

    const button = await screen.findByText("Enter Room");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Your name must be between 1 and 50 characters")
      ).toBeInTheDocument();
    });
  });

  it("should show error when room not found on join", async () => {
    const user = userEvent.setup();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    render(<SessionPage />);

    const input = screen.getByLabelText("Your Name");
    await user.type(input, "Jane");
    const button = screen.getByText("Enter Room");
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText("Room not found. Please check the link and try again.")
      ).toBeInTheDocument();
    });
  });

  it("should join session successfully from join form", async () => {
    const user = userEvent.setup();
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    });

    render(<SessionPage />);

    const input = screen.getByLabelText("Your Name");
    await user.type(input, "Jane");
    const button = screen.getByText("Enter Room");
    await user.click(button);

    await waitFor(() => {
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "session_TEST123_userId",
        expect.any(String)
      );
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "session_TEST123_name",
        "Jane"
      );
      // Should now show the session UI instead of join form
      expect(screen.queryByText("Join Planning Poker")).not.toBeInTheDocument();
      expect(screen.getByText("Planning Poker")).toBeInTheDocument();
    });
  });

  it("should initialize WebSocket connection with userId from localStorage", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalledWith({
        roomId: "TEST123",
        userId: "user123",
        onMessage: expect.any(Function),
        onConnect: expect.any(Function),
        onDisconnect: expect.any(Function),
        onError: expect.any(Function),
      });
    });
  });

  it("should send join-session message on connection", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    // Get the onConnect callback that was passed to useWebSocket
    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    const useWebSocketCall = (useWebSocket as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const onConnect = useWebSocketCall.onConnect;

    // Call onConnect to simulate connection
    onConnect();

    // Verify join-session message was sent
    expect(mockSendMessage).toHaveBeenCalledWith({
      type: "join-session",
      participantName: "Test User",
    });
  });

  it("should send join-session message on reconnection", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    // Start with disconnected state
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    const { rerender } = render(<SessionPage />);

    // Initial state - not connected, no message sent
    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    // Simulate connection
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });
    rerender(<SessionPage />);

    // Should send join-session on first connection
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "join-session",
        participantName: "Test User",
      });
    });

    // Get the onConnect callback and call it to simulate reconnection
    const useWebSocketCall = (useWebSocket as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const onConnect = useWebSocketCall.onConnect;

    // Simulate disconnection then reconnection
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });
    rerender(<SessionPage />);

    // Call onConnect to reset the hasJoined flag
    onConnect();

    // Now reconnect
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });
    rerender(<SessionPage />);

    // Should send join-session again on reconnection
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(2);
    });

    expect(mockSendMessage).toHaveBeenNthCalledWith(2, {
      type: "join-session",
      participantName: "Test User",
    });
  });

  it("should display room code", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("TEST123")).toBeInTheDocument();
    });
  });

  it("should show Copy Link button next to room code", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });
  });

  it("should copy link and show 'Copied!' feedback", async () => {
    const user = userEvent.setup();
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<SessionPage />);

    const copyButton = await screen.findByText("Copy Link");
    await user.click(copyButton);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(window.location.href);
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("should show connected status when WebSocket is connected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
  });

  it("should show disconnected status when WebSocket is disconnected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Disconnected")).toBeInTheDocument();
    });
  });

  it("should show reconnect button when disconnected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      const reconnectButton = screen.getByText("Reconnect");
      expect(reconnectButton).toBeInTheDocument();
    });
  });

  it("should not show reconnect button when connected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.queryByText("Reconnect")).not.toBeInTheDocument();
    });
  });

  it("should call reconnect when reconnect button is clicked", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      const reconnectButton = screen.getByText("Reconnect");
      reconnectButton.click();
    });

    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });

  it("should show connecting status when WebSocket is connecting", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });
  });

  it("should not show reconnect button when connecting", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
      expect(screen.queryByText("Reconnect")).not.toBeInTheDocument();
    });
  });

  it("should display join form when no credentials in localStorage", () => {
    (window.localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    render(<SessionPage />);

    expect(screen.getByText("Join Planning Poker")).toBeInTheDocument();
    expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
  });

  it("should retrieve userId and name with correct localStorage keys", async () => {
    const getItemSpy = vi
      .spyOn(window.localStorage, "getItem")
      .mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

    render(<SessionPage />);

    await waitFor(() => {
      expect(getItemSpy).toHaveBeenCalledWith("session_TEST123_userId");
      expect(getItemSpy).toHaveBeenCalledWith("session_TEST123_name");
    });
  });

  it("should render card deck component", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
    });
  });

  it("should update participants on session-state message", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    // Simulate session-state message
    await act(async () => {
      onMessageCallback({
        type: "session-state",
        sessionId: "TEST123",
        sessionName: "Test Session",
        moderatorId: "user123",
        isRevealed: false,
        isVotingOpen: true,
        participants: [
          {
            id: "user123",
            name: "Test User",
            isModerator: true,
            isConnected: true,
          },
          {
            id: "user456",
            name: "Other User",
            isModerator: false,
            isConnected: true,
          },
        ],
        votes: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("Other User")).toBeInTheDocument();
      expect(screen.getByText("Participants (2)")).toBeInTheDocument();
    });
  });

  it("should add participant on participant-joined message", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    // Initially show empty participant list
    expect(screen.getByText("No participants yet")).toBeInTheDocument();

    // Simulate participant-joined message
    await act(async () => {
      onMessageCallback({
        type: "participant-joined",
        participant: {
          id: "user456",
          name: "New User",
          isModerator: false,
          isConnected: true,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("New User")).toBeInTheDocument();
      expect(screen.getByText("Participants (1)")).toBeInTheDocument();
    });
  });

  it("should mark participant as disconnected on participant-left message", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    const { container } = render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    // Add a participant first
    await act(async () => {
      onMessageCallback({
        type: "session-state",
        sessionId: "TEST123",
        sessionName: "Test Session",
        moderatorId: "user123",
        isRevealed: false,
        isVotingOpen: true,
        participants: [
          {
            id: "user456",
            name: "Leaving User",
            isModerator: false,
            isConnected: true,
          },
        ],
        votes: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Leaving User")).toBeInTheDocument();
      // Check participant list has one green dot (participant is online)
      const participantList = container.querySelector(".lg\\:col-span-1");
      const greenDots = participantList?.querySelectorAll(".bg-green-500");
      expect(greenDots?.length).toBe(1);
    });

    // Simulate participant-left message
    await act(async () => {
      onMessageCallback({
        type: "participant-left",
        userId: "user456",
      });
    });

    await waitFor(() => {
      // Participant should still be in list but marked as disconnected
      expect(screen.getByText("Leaving User")).toBeInTheDocument();
      // Check participant list has one gray dot (participant is offline)
      const participantList = container.querySelector(".lg\\:col-span-1");
      const grayDots = participantList?.querySelectorAll(
        ".bg-muted-foreground"
      );
      expect(grayDots?.length).toBe(1);
      // Should have no green dots in participant list anymore
      const greenDots = participantList?.querySelectorAll(".bg-green-500");
      expect(greenDots?.length).toBe(0);
    });
  });

  it("should not add duplicate participants", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    // Add participant first time
    await act(async () => {
      onMessageCallback({
        type: "participant-joined",
        participant: {
          id: "user456",
          name: "Test User",
          isModerator: false,
          isConnected: true,
        },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Participants (1)")).toBeInTheDocument();
    });

    // Try to add same participant again
    await act(async () => {
      onMessageCallback({
        type: "participant-joined",
        participant: {
          id: "user456",
          name: "Test User",
          isModerator: false,
          isConnected: true,
        },
      });
    });

    // Should still have only 1 participant
    await waitFor(() => {
      expect(screen.getByText("Participants (1)")).toBeInTheDocument();
    });
  });

  it("should render participant list component", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Participants")).toBeInTheDocument();
    });
  });

  it("should send submit-vote message when card is selected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    // Open voting by simulating a session-state with isVotingOpen: true
    await act(async () => {
      onMessageCallback({
        type: "session-state",
        sessionId: "TEST123",
        sessionName: "Test Session",
        moderatorId: "moderator123",
        isRevealed: false,
        isVotingOpen: true,
        participants: [],
        votes: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
    });

    // Click on card 5
    const card5 = screen.getByLabelText("Select 5");
    await act(async () => {
      card5.click();
    });

    // Verify submit-vote message was sent
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "submit-vote",
        value: "5",
      });
    });
  });

  it("should allow changing vote by selecting different card", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    // Open voting
    await act(async () => {
      onMessageCallback({
        type: "session-state",
        sessionId: "TEST123",
        sessionName: "Test Session",
        moderatorId: "moderator123",
        isRevealed: false,
        isVotingOpen: true,
        participants: [],
        votes: {},
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
    });

    // Click on card 5
    const card5 = screen.getByLabelText("Select 5");
    await act(async () => {
      card5.click();
    });

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "submit-vote",
        value: "5",
      });
    });

    // Click on card 8
    const card8 = screen.getByLabelText("Select 8");
    await act(async () => {
      card8.click();
    });

    // Verify submit-vote message was sent again with new value
    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith({
        type: "submit-vote",
        value: "8",
      });
    });
  });

  it("should disable card deck when disconnected", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });
    (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      sendMessage: mockSendMessage,
      reconnect: mockReconnect,
      clearError: vi.fn(),
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
    });

    // All cards should be disabled
    const card5 = screen.getByLabelText("Select 5");
    expect(card5).toBeDisabled();
  });

  it("should update voted status on vote-submitted message", async () => {
    (
      window.localStorage.getItem as ReturnType<typeof vi.fn>
    ).mockImplementation((key: string) => {
      if (key === "session_TEST123_userId") return "user123";
      if (key === "session_TEST123_name") return "Test User";
      return null;
    });

    let onMessageCallback: (message: unknown) => void = () => {};
    (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation((config) => {
      onMessageCallback = config.onMessage;
      return {
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      };
    });

    render(<SessionPage />);

    await waitFor(() => {
      expect(useWebSocket).toHaveBeenCalled();
    });

    // Add participants first
    await act(async () => {
      onMessageCallback({
        type: "session-state",
        sessionId: "TEST123",
        sessionName: "Test Session",
        moderatorId: "user123",
        isRevealed: false,
        isVotingOpen: true,
        participants: [
          {
            id: "user123",
            name: "Test User",
            isModerator: true,
            isConnected: true,
          },
          {
            id: "user456",
            name: "Other User",
            isModerator: false,
            isConnected: true,
          },
        ],
        votes: {},
      });
    });

    // Initially no voted indicators (no checkmark badges)
    expect(
      document.querySelectorAll('li[aria-label*="Voted"]').length
    ).toBe(0);

    // Simulate vote-submitted message
    await act(async () => {
      onMessageCallback({
        type: "vote-submitted",
        userId: "user456",
      });
    });

    // Should now show voted indicator for user456 (checkmark badge)
    await waitFor(() => {
      expect(
        document.querySelectorAll('li[aria-label*="Voted"]').length
      ).toBe(1);
    });
  });

  describe("Topic Setting/Updating", () => {
    it("should display topic section to all users", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Topic")).toBeInTheDocument();
      });
    });

    it("should show topic input for moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("What are we estimating?")
        ).toBeInTheDocument();
        expect(screen.getByText("Start Vote")).toBeInTheDocument();
      });
    });

    it("should show topic text for non-moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with different moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          currentTopic: "Build login page",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Build login page")).toBeInTheDocument();
        expect(
          screen.queryByPlaceholderText("What are we estimating?")
        ).not.toBeInTheDocument();
      });
    });

    it("should show 'No topic set yet' when no topic exists for non-moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state without topic
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(screen.getByText("No topic set yet")).toBeInTheDocument();
      });
    });

    it("should send set-topic message when moderator clicks Start Vote", async () => {
      const user = userEvent.setup();
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      const input = await screen.findByPlaceholderText(
        "What are we estimating?"
      );
      const button = screen.getByText("Start Vote");

      // Type into input
      await user.clear(input);
      await user.type(input, "New user story");

      // Click Start Vote button
      await user.click(button);

      // Verify set-topic message was sent
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: "set-topic",
          topic: "New user story",
        });
      });
    });

    it("should update topic when topic-changed message is received", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state first
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          currentTopic: "Old topic",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Old topic")).toBeInTheDocument();
      });

      // Send topic-changed message
      await act(async () => {
        onMessageCallback({
          type: "topic-changed",
          topic: "Updated topic",
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Updated topic")).toBeInTheDocument();
        expect(screen.queryByText("Old topic")).not.toBeInTheDocument();
      });
    });

    it("should disable topic input when disconnected", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: false,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      const input = await screen.findByPlaceholderText(
        "What are we estimating?"
      );
      const button = screen.getByText("Start Vote");

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it("should have maxLength of 200 on topic input", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      const input = (await screen.findByPlaceholderText(
        "What are we estimating?"
      )) as HTMLInputElement;

      // Input should have maxLength attribute
      expect(input.maxLength).toBe(200);
    });

    it("should sync topic input with current topic on session-state", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with topic
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          currentTopic: "Existing topic",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      const input = (await screen.findByPlaceholderText(
        "What are we estimating?"
      )) as HTMLInputElement;

      // Input should be populated with existing topic
      await waitFor(() => {
        expect(input.value).toBe("Existing topic");
      });
    });

    it("should trim whitespace when sending topic", async () => {
      const user = userEvent.setup();
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      const input = await screen.findByPlaceholderText(
        "What are we estimating?"
      );
      const button = screen.getByText("Start Vote");

      // Type into input with whitespace
      await user.clear(input);
      await user.type(input, "  Topic with spaces  ");

      // Click Start Vote button
      await user.click(button);

      // Verify set-topic message was sent with trimmed topic
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: "set-topic",
          topic: "Topic with spaces",
        });
      });
    });
  });

  describe("Vote Reveal", () => {
    it("should show reveal votes button for moderator when not revealed", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID and not revealed
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(screen.getByText("Reveal")).toBeInTheDocument();
      });
    });

    it("should not show reveal votes button for non-moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with different moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText("Topic")).toBeInTheDocument();
      });

      // Should not show reveal votes button
      expect(screen.queryByText("Reveal")).not.toBeInTheDocument();
    });

    it("should not show reveal votes button when votes are already revealed", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID and revealed
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: true,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText("Topic")).toBeInTheDocument();
      });

      // Should not show reveal votes button
      expect(screen.queryByText("Reveal")).not.toBeInTheDocument();
    });

    it("should send reveal-votes message when moderator clicks Reveal", async () => {
      const user = userEvent.setup();
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      const button = await screen.findByText("Reveal");

      // Click Reveal Votes button
      await user.click(button);

      // Verify reveal-votes message was sent
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: "reveal-votes",
        });
      });
    });

    it("should disable reveal votes button when disconnected", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: false,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      const button = await screen.findByText("Reveal");

      expect(button).toBeDisabled();
    });

    it("should update reveal state when votes-revealed message is received", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID and not revealed
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Button should be visible
      await waitFor(() => {
        expect(screen.getByText("Reveal")).toBeInTheDocument();
      });

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {},
          statistics: {
            average: null,
            mode: null,
            min: null,
            max: null,
            range: null,
          },
        });
      });

      // Button should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText("Reveal")).not.toBeInTheDocument();
      });
    });
  });

  describe("Vote Results", () => {
    it("should display vote results after votes-revealed message", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with participants
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "user123",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
            {
              id: "user456",
              name: "Bob",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Results should not be visible initially
      expect(screen.queryByText("Results")).not.toBeInTheDocument();

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            user123: { userId: "user123", value: "5", submittedAt: Date.now() },
            user456: { userId: "user456", value: "8", submittedAt: Date.now() },
          },
          statistics: {
            average: 6.5,
            mode: "5",
            min: 5,
            max: 8,
            range: 3,
          },
        });
      });

      // Results should now be visible
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
        // Alice and Bob appear in both participant list and vote results, so use getAllByText
        expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Bob").length).toBeGreaterThan(0);
        expect(screen.getAllByText("5").length).toBeGreaterThan(0);
        expect(screen.getAllByText("8").length).toBeGreaterThan(0);
      });
    });

    it("should display statistics after votes-revealed message", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "user123",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Send votes-revealed message with statistics
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            user123: { userId: "user123", value: "5", submittedAt: Date.now() },
          },
          statistics: {
            average: 5.0,
            mode: "5",
            min: 5,
            max: 5,
            range: 0,
          },
        });
      });

      // Statistics should be visible
      await waitFor(() => {
        expect(screen.getByText("Statistics")).toBeInTheDocument();
        expect(screen.getByText("Average")).toBeInTheDocument();
        expect(screen.getByText("5.0")).toBeInTheDocument();
        expect(screen.getByText("Most Common")).toBeInTheDocument();
        expect(screen.getByText("Range")).toBeInTheDocument();
        expect(screen.getByText("5 - 5")).toBeInTheDocument();
        expect(screen.getByText("Spread")).toBeInTheDocument();
        // "0" appears in both card deck and statistics, so use getAllByText
        expect(screen.getAllByText("0").length).toBeGreaterThan(0);
      });
    });

    it("should not display results before reveal", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Topic")).toBeInTheDocument();
      });

      // Results should not be visible
      expect(screen.queryByText("Results")).not.toBeInTheDocument();
    });

    it("should display votes section header in results", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "user123",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            user123: { userId: "user123", value: "5", submittedAt: Date.now() },
          },
          statistics: {
            average: 5.0,
            mode: "5",
            min: 5,
            max: 5,
            range: 0,
          },
        });
      });

      // Votes section should be visible
      await waitFor(() => {
        expect(screen.getByText("Votes")).toBeInTheDocument();
      });
    });
  });

  describe("Role-Based UI", () => {
    it("should show all moderator controls (topic input, reveal, new round) to moderator only", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Moderator should see topic input and Reveal button during voting
      await waitFor(() => {
        expect(
          screen.getByPlaceholderText("What are we estimating?")
        ).toBeInTheDocument();
      });

      // Start Vote button should be hidden during voting
      expect(screen.queryByText("Start Vote")).not.toBeInTheDocument();

      // Moderator should see Reveal Votes button when not revealed
      expect(screen.getByText("Reveal")).toBeInTheDocument();

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {},
          statistics: {
            average: null,
            mode: null,
            min: null,
            max: null,
            range: null,
          },
        });
      });

      // After reveal, moderator should see Next Vote button
      await waitFor(() => {
        expect(screen.getByText("Next Vote")).toBeInTheDocument();
      });

      // Reveal button should be hidden after reveal
      expect(screen.queryByText("Reveal")).not.toBeInTheDocument();
    });

    it("should hide all moderator controls (topic input, reveal, new round) from voters", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "voter123";
        if (key === "session_TEST123_name") return "Voter";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with different moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          currentTopic: "Test topic",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText("Test topic")).toBeInTheDocument();
      });

      // Voter should NOT see topic input or Update Topic button
      expect(
        screen.queryByPlaceholderText("What are we estimating?")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Start Vote")).not.toBeInTheDocument();

      // Voter should NOT see Reveal Votes button
      expect(screen.queryByText("Reveal")).not.toBeInTheDocument();

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {},
          statistics: {
            average: null,
            mode: null,
            min: null,
            max: null,
            range: null,
          },
        });
      });

      // After reveal, voter should NOT see Start Vote or Next Vote button
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });
      expect(screen.queryByText("Start Vote")).not.toBeInTheDocument();
      expect(screen.queryByText("Next Vote")).not.toBeInTheDocument();
    });

    it("should show voter UI (card deck) to all participants including moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      render(<SessionPage />);

      // Card deck should be visible to all users
      await waitFor(() => {
        expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
      });

      // Verify all cards are present
      expect(screen.getByLabelText("Select 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 3")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 5")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 8")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 13")).toBeInTheDocument();
      expect(screen.getByLabelText("Select 21")).toBeInTheDocument();
    });

    it("should show voter UI (card deck) to moderator as well", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Card deck should be visible even to moderator
      await waitFor(() => {
        expect(screen.getByText("Select Your Estimate")).toBeInTheDocument();
      });
    });

    it("should ensure voters can see results after reveal", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "voter123";
        if (key === "session_TEST123_name") return "Voter";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with participants
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "voter123",
              name: "Voter",
              isModerator: false,
              isConnected: true,
            },
            {
              id: "user456",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Results should not be visible before reveal
      expect(screen.queryByText("Results")).not.toBeInTheDocument();

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            voter123: {
              userId: "voter123",
              value: "5",
              submittedAt: Date.now(),
            },
            user456: { userId: "user456", value: "8", submittedAt: Date.now() },
          },
          statistics: {
            average: 6.5,
            mode: "5",
            min: 5,
            max: 8,
            range: 3,
          },
        });
      });

      // Voter should see results after reveal
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });

      // Voter should see votes section
      expect(screen.getByText("Votes")).toBeInTheDocument();

      // Voter should see statistics
      expect(screen.getByText("Statistics")).toBeInTheDocument();
      expect(screen.getByText("Average")).toBeInTheDocument();
      expect(screen.getByText("6.5")).toBeInTheDocument();
    });

    it("should ensure moderator can also see results after reveal", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "moderator123",
              name: "Moderator",
              isModerator: true,
              isConnected: true,
            },
            {
              id: "user456",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            moderator123: {
              userId: "moderator123",
              value: "3",
              submittedAt: Date.now(),
            },
            user456: { userId: "user456", value: "8", submittedAt: Date.now() },
          },
          statistics: {
            average: 5.5,
            mode: "3",
            min: 3,
            max: 8,
            range: 5,
          },
        });
      });

      // Moderator should see results after reveal
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });

      // Moderator should see votes and statistics
      expect(screen.getByText("Votes")).toBeInTheDocument();
      expect(screen.getByText("Statistics")).toBeInTheDocument();
      expect(screen.getByText("Average")).toBeInTheDocument();
      expect(screen.getByText("5.5")).toBeInTheDocument();
    });
  });

  describe("New Round", () => {
    it("should hide button during voting and show Next Vote after reveal", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with voting open
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Button should be hidden during voting
      await waitFor(() => {
        expect(screen.getByText("Reveal")).toBeInTheDocument();
      });
      expect(screen.queryByText("Start Vote")).not.toBeInTheDocument();
      expect(screen.queryByText("Next Vote")).not.toBeInTheDocument();

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {},
          statistics: {
            average: null,
            mode: null,
            min: null,
            max: null,
            range: null,
          },
        });
      });

      // After reveal, button should appear as "Next Vote"
      await waitFor(() => {
        expect(screen.getByText("Next Vote")).toBeInTheDocument();
      });
    });

    it("should not show start vote button for non-moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with different moderator ID
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [],
          votes: {},
        });
      });

      // Send votes-revealed message
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {},
          statistics: {
            average: null,
            mode: null,
            min: null,
            max: null,
            range: null,
          },
        });
      });

      // Wait for results to appear
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });

      // Start Vote / Next Vote button should not be visible for non-moderator
      expect(screen.queryByText("Start Vote")).not.toBeInTheDocument();
      expect(screen.queryByText("Next Vote")).not.toBeInTheDocument();
    });

    it("should show start vote button for moderator when votes are not revealed", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID and not revealed, not voting
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      // Wait for page to render
      await waitFor(() => {
        expect(screen.getByText("Topic")).toBeInTheDocument();
      });

      // Start Vote button should be visible for moderator
      expect(screen.getByText("Start Vote")).toBeInTheDocument();
    });

    it("should send new-round message when moderator clicks Start Vote", async () => {
      const user = userEvent.setup();
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID, not voting
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      const button = await screen.findByText("Start Vote");

      // Click Start Vote button
      await user.click(button);

      // Verify new-round message was sent
      await waitFor(() => {
        expect(mockSendMessage).toHaveBeenCalledWith({
          type: "new-round",
        });
      });
    });

    it("should disable start vote button when disconnected", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: false,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state with moderator ID, not voting
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [],
          votes: {},
        });
      });

      const button = await screen.findByText("Start Vote");

      expect(button).toBeDisabled();
    });

    it("should reset UI state when round-started message is received", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await waitFor(() => {
        expect(useWebSocket).toHaveBeenCalled();
      });

      // Send session-state
      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "user123",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      // Send votes-revealed message to set up revealed state
      await act(async () => {
        onMessageCallback({
          type: "votes-revealed",
          votes: {
            user123: { userId: "user123", value: "5", submittedAt: Date.now() },
          },
          statistics: {
            average: 5.0,
            mode: "5",
            min: 5,
            max: 5,
            range: 0,
          },
        });
      });

      // Results should be visible
      await waitFor(() => {
        expect(screen.getByText("Results")).toBeInTheDocument();
      });

      // Send round-started message
      await act(async () => {
        onMessageCallback({
          type: "round-started",
        });
      });

      // Results should no longer be visible
      await waitFor(() => {
        expect(screen.queryByText("Results")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when error prop is set", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: false,
        error: "Connection error. Attempting to reconnect...",
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Connection Error")).toBeInTheDocument();
        expect(
          screen.getByText("Connection error. Attempting to reconnect...")
        ).toBeInTheDocument();
      });
    });

    it("should not display error message when error is null", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: true,
        isConnecting: false,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Connected")).toBeInTheDocument();
      });

      expect(screen.queryByText("Connection Error")).not.toBeInTheDocument();
    });

    it("should call clearError when dismiss button is clicked", async () => {
      const user = userEvent.setup();
      const mockClearError = vi.fn();
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: false,
        error: "Connection lost. Reconnecting (attempt 1)...",
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: mockClearError,
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Connection Error")).toBeInTheDocument();
      });

      const dismissButton = screen.getByLabelText("Dismiss error");
      await user.click(dismissButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
    });

    it("should display error banner with warning icon", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: false,
        error: "Connection error. Attempting to reconnect...",
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("⚠️")).toBeInTheDocument();
      });
    });

    it("should show different error messages for different scenarios", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: false,
        error: "Connection lost. Reconnecting (attempt 3)...",
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Connection lost. Reconnecting (attempt 3)...")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Connecting State", () => {
    it("should show connecting status indicator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: true,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Connecting...")).toBeInTheDocument();
      });
    });

    it("should not show reconnect button when connecting", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "user123";
        if (key === "session_TEST123_name") return "Test User";
        return null;
      });
      (useWebSocket as ReturnType<typeof vi.fn>).mockReturnValue({
        isConnected: false,
        isConnecting: true,
        error: null,
        sendMessage: mockSendMessage,
        reconnect: mockReconnect,
        clearError: vi.fn(),
      });

      render(<SessionPage />);

      await waitFor(() => {
        expect(screen.getByText("Connecting...")).toBeInTheDocument();
      });

      expect(screen.queryByText("Reconnect")).not.toBeInTheDocument();
    });
  });

  describe("Voting Progress Bar", () => {
    it("should show voting progress bar when voting is open for moderator", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "moderator123",
              name: "Moderator",
              isModerator: true,
              isConnected: true,
            },
            {
              id: "user2",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
            { id: "user3", name: "Bob", isModerator: false, isConnected: true },
          ],
          votes: {
            user2: { userId: "user2", value: 5, submittedAt: Date.now() },
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("1 of 3 voted")).toBeInTheDocument();
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });

    it("should not show progress bar when voting is not open", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: false,
          participants: [
            {
              id: "moderator123",
              name: "Moderator",
              isModerator: true,
              isConnected: true,
            },
          ],
          votes: {},
        });
      });

      await waitFor(() => {
        expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      });
    });

    it("should show green ring when all have voted", async () => {
      (
        window.localStorage.getItem as ReturnType<typeof vi.fn>
      ).mockImplementation((key: string) => {
        if (key === "session_TEST123_userId") return "moderator123";
        if (key === "session_TEST123_name") return "Moderator";
        return null;
      });

      let onMessageCallback: (message: unknown) => void = () => {};
      (useWebSocket as ReturnType<typeof vi.fn>).mockImplementation(
        (config) => {
          onMessageCallback = config.onMessage;
          return {
            isConnected: true,
            sendMessage: mockSendMessage,
            reconnect: mockReconnect,
          };
        }
      );

      render(<SessionPage />);

      await act(async () => {
        onMessageCallback({
          type: "session-state",
          sessionId: "TEST123",
          sessionName: "Test Session",
          moderatorId: "moderator123",
          isRevealed: false,
          isVotingOpen: true,
          participants: [
            {
              id: "moderator123",
              name: "Moderator",
              isModerator: true,
              isConnected: true,
            },
            {
              id: "user2",
              name: "Alice",
              isModerator: false,
              isConnected: true,
            },
          ],
          votes: {
            moderator123: {
              userId: "moderator123",
              value: 3,
              submittedAt: Date.now(),
            },
            user2: { userId: "user2", value: 5, submittedAt: Date.now() },
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText("2 of 2 voted")).toBeInTheDocument();
        expect(screen.getByRole("progressbar")).toBeInTheDocument();
      });
    });
  });
});
