import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ModeratorWelcomeModal } from "@/components/ModeratorWelcomeModal";

describe("ModeratorWelcomeModal", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin
    Object.defineProperty(window, "location", {
      value: {
        origin: "http://localhost:3000",
        href: "http://localhost:3000/session/ABC123",
      },
      writable: true,
    });
  });

  it("renders the modal with correct title", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    expect(screen.getByText("Welcome, Moderator!")).toBeInTheDocument();
  });

  it("renders the dialog with correct ARIA attributes", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute(
      "aria-labelledby",
      "moderator-modal-title"
    );
  });

  it("displays moderator capabilities", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    expect(
      screen.getByText("Set the topic for each estimation round")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Start voting rounds and reveal results")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Control the pace of the session")
    ).toBeInTheDocument();
  });

  it("displays the room URL", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    expect(
      screen.getByText("http://localhost:3000/session/ABC123")
    ).toBeInTheDocument();
  });

  it("displays invite section", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    expect(screen.getByText("Invite your team")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Share this link with your team so they can join this room:"
      )
    ).toBeInTheDocument();
  });

  it("displays Copy Link button", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    expect(screen.getByText("Copy Link")).toBeInTheDocument();
  });

  it("copies link to clipboard when Copy Link is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Copy Link"));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "http://localhost:3000/session/ABC123"
      );
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("calls onClose when dismiss button is clicked", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Got it, let's start!"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when backdrop is clicked", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    const backdrop = screen.getByRole("presentation");
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when dialog content is clicked", () => {
    render(<ModeratorWelcomeModal roomId="ABC123" onClose={mockOnClose} />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(dialog);
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
