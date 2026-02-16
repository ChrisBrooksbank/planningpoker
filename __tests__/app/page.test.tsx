import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "@/app/page";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Home Page", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = vi.fn();
    // Mock fetch
    global.fetch = vi.fn();
  });

  describe("Landing Mode", () => {
    it("displays the title and description", () => {
      render(<Home />);
      expect(screen.getByText("Planning Poker")).toBeInTheDocument();
      expect(
        screen.getByText("Real-time collaborative story point estimation")
      ).toBeInTheDocument();
    });

    it("displays Create Room button", () => {
      render(<Home />);
      expect(screen.getByText("Create Room")).toBeInTheDocument();
    });

    it("displays Enter Room button", () => {
      render(<Home />);
      expect(screen.getByText("Enter Room")).toBeInTheDocument();
    });

    it("navigates to create mode when Create Room is clicked", () => {
      render(<Home />);
      const createButton = screen.getByText("Create Room");
      fireEvent.click(createButton);
      expect(
        screen.getByText("Create a new planning poker room")
      ).toBeInTheDocument();
    });

    it("navigates to join mode when Enter Room is clicked", () => {
      render(<Home />);
      const joinButton = screen.getByRole("button", { name: "Enter Room" });
      fireEvent.click(joinButton);
      expect(
        screen.getByText("Enter the room code shared by your moderator")
      ).toBeInTheDocument();
    });
  });

  describe("Create Mode", () => {
    it("displays create session header", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      expect(
        screen.getByRole("heading", { name: "Create Room" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Create a new planning poker room")
      ).toBeInTheDocument();
    });

    it("displays back button", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      expect(screen.getByText("← Back")).toBeInTheDocument();
    });

    it("navigates back to landing when back button is clicked", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      fireEvent.click(screen.getByText("← Back"));
      expect(
        screen.getByText("Real-time collaborative story point estimation")
      ).toBeInTheDocument();
    });

    it("displays session name input field", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      expect(screen.getByLabelText("Room Name")).toBeInTheDocument();
    });

    it("displays moderator name input field", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    });

    it("displays create session submit button", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));
      // Now we should find the submit button in the form
      const submitButtons = screen.getAllByRole("button", {
        name: "Create Room",
      });
      expect(submitButtons.length).toBeGreaterThan(0);
    });

    it("shows validation error for session name with only whitespace", async () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, { target: { value: "   " } });
      fireEvent.change(moderatorNameInput, { target: { value: "John Doe" } });
      fireEvent.submit(submitButton.closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("Room name must be between 1 and 100 characters")
        ).toBeInTheDocument();
      });
    });

    it("shows validation error for moderator name with only whitespace", async () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, { target: { value: "Sprint 24" } });
      fireEvent.change(moderatorNameInput, { target: { value: "   " } });
      fireEvent.submit(submitButton.closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("Your name must be between 1 and 50 characters")
        ).toBeInTheDocument();
      });
    });

    it("calls API and redirects on successful session creation", async () => {
      const mockResponse = {
        roomId: "abc123",
        sessionName: "Sprint 24",
        moderatorId: "mod123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, { target: { value: "Sprint 24" } });
      fireEvent.change(moderatorNameInput, { target: { value: "John Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionName: "Sprint 24",
            moderatorName: "John Doe",
            deckType: "fibonacci",
          }),
        });
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "session_abc123_userId",
          "mod123"
        );
        expect(mockPush).toHaveBeenCalledWith("/session/abc123");
      });
    });

    it("shows error message when API returns error", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Session name is required" }),
      });

      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, { target: { value: "Sprint 24" } });
      fireEvent.change(moderatorNameInput, { target: { value: "John Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Session name is required")
        ).toBeInTheDocument();
      });
    });

    it("shows loading state while creating session", async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, { target: { value: "Sprint 24" } });
      fireEvent.change(moderatorNameInput, { target: { value: "John Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Creating...")).toBeInTheDocument();
      });
    });

    it("trims whitespace from inputs before submitting", async () => {
      const mockResponse = {
        roomId: "abc123",
        sessionName: "Sprint 24",
        moderatorId: "mod123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Create Room" }));

      const sessionNameInput = screen.getByLabelText("Room Name");
      const moderatorNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", {
        name: "Create Room",
      });

      fireEvent.change(sessionNameInput, {
        target: { value: "  Sprint 24  " },
      });
      fireEvent.change(moderatorNameInput, {
        target: { value: "  John Doe  " },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith("/api/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionName: "Sprint 24",
            moderatorName: "John Doe",
            deckType: "fibonacci",
          }),
        });
      });
    });
  });

  describe("Join Mode", () => {
    it("displays join session header", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Enter Room" }));
      expect(
        screen.getByRole("heading", { name: "Enter Room" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Enter the room code shared by your moderator")
      ).toBeInTheDocument();
    });

    it("displays back button", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Enter Room" }));
      expect(screen.getByText("← Back")).toBeInTheDocument();
    });

    it("navigates back to landing when back button is clicked", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Enter Room" }));
      fireEvent.click(screen.getByText("← Back"));
      expect(
        screen.getByText("Real-time collaborative story point estimation")
      ).toBeInTheDocument();
    });

    it("displays room code input field", () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);
      expect(screen.getByLabelText("Room Code")).toBeInTheDocument();
    });

    it("displays participant name input field", () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);
      expect(screen.getByLabelText("Your Name")).toBeInTheDocument();
    });

    it("displays join session submit button", () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);
      expect(
        screen.getByRole("button", { name: "Enter Room" })
      ).toBeInTheDocument();
    });

    it("converts room code to uppercase automatically", () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText(
        "Room Code"
      ) as HTMLInputElement;
      fireEvent.change(roomCodeInput, { target: { value: "abc123" } });

      expect(roomCodeInput.value).toBe("ABC123");
    });

    it("shows validation error for invalid room code format", async () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "12" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });
      fireEvent.submit(submitButton.closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("Room code must be 6 characters")
        ).toBeInTheDocument();
      });
    });

    it("shows validation error for participant name with only whitespace", async () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "   " } });
      fireEvent.submit(submitButton.closest("form")!);

      await waitFor(() => {
        expect(
          screen.getByText("Your name must be between 1 and 50 characters")
        ).toBeInTheDocument();
      });
    });

    it("shows error when room code does not exist", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: "Session not found" }),
      });

      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Room code not found. Please check and try again.")
        ).toBeInTheDocument();
      });
    });

    it("calls API and redirects on successful join", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      });

      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/sessions/ABC123/validate"
        );
      });

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "session_ABC123_name",
          "Jane Doe"
        );
        expect(mockPush).toHaveBeenCalledWith("/session/ABC123");
      });
    });

    it("shows loading state while joining session", async () => {
      (global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Entering...")).toBeInTheDocument();
      });
    });

    it("trims whitespace from participant name before storing", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ exists: true }),
      });

      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, {
        target: { value: "  Jane Doe  " },
      });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "session_ABC123_name",
          "Jane Doe"
        );
      });
    });

    it("resets form state when navigating back to landing", () => {
      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });

      fireEvent.click(screen.getByText("← Back"));

      // Navigate back to join mode
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const newRoomCodeInput = screen.getByLabelText(
        "Room Code"
      ) as HTMLInputElement;
      const newParticipantNameInput = screen.getByLabelText(
        "Your Name"
      ) as HTMLInputElement;

      expect(newRoomCodeInput.value).toBe("");
      expect(newParticipantNameInput.value).toBe("");
    });

    it("shows generic error message when validation API fails with non-404 error", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: "Internal server error" }),
      });

      render(<Home />);
      fireEvent.click(screen.getAllByText("Enter Room")[0]);

      const roomCodeInput = screen.getByLabelText("Room Code");
      const participantNameInput = screen.getByLabelText("Your Name");
      const submitButton = screen.getByRole("button", { name: "Enter Room" });

      fireEvent.change(roomCodeInput, { target: { value: "ABC123" } });
      fireEvent.change(participantNameInput, { target: { value: "Jane Doe" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to validate room code")
        ).toBeInTheDocument();
      });
    });
  });
});
