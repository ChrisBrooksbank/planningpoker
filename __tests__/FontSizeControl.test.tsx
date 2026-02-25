import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FontSizeControl } from "@/components/FontSizeControl";

describe("FontSizeControl", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.style.fontSize = "";
  });

  it("renders disabled buttons before mount", () => {
    // Component renders placeholder before useEffect runs
    const { container } = render(<FontSizeControl />);
    const buttons = container.querySelectorAll("button");
    // After mount, buttons become enabled (useEffect runs synchronously in test)
    expect(buttons).toHaveLength(2);
  });

  it("renders decrease and increase buttons", () => {
    render(<FontSizeControl />);
    expect(
      screen.getByRole("button", { name: /decrease font size/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /increase font size/i })
    ).toBeInTheDocument();
  });

  it("displays the default font size (16)", () => {
    render(<FontSizeControl />);
    expect(screen.getByText("16")).toBeInTheDocument();
  });

  it("has a font size controls group", () => {
    render(<FontSizeControl />);
    expect(
      screen.getByRole("group", { name: "Font size controls" })
    ).toBeInTheDocument();
  });

  it("increases font size when + button is clicked", () => {
    render(<FontSizeControl />);
    const increaseBtn = screen.getByRole("button", {
      name: /increase font size/i,
    });

    fireEvent.click(increaseBtn);

    expect(screen.getByText("18")).toBeInTheDocument();
    expect(document.documentElement.style.fontSize).toBe("18px");
  });

  it("decreases font size when - button is clicked", () => {
    render(<FontSizeControl />);
    const decreaseBtn = screen.getByRole("button", {
      name: /decrease font size/i,
    });

    fireEvent.click(decreaseBtn);

    expect(screen.getByText("14")).toBeInTheDocument();
    expect(document.documentElement.style.fontSize).toBe("14px");
  });

  it("disables decrease button at minimum size", () => {
    render(<FontSizeControl />);
    const decreaseBtn = screen.getByRole("button", {
      name: /decrease font size/i,
    });

    // Default is 16 (index 1), click once to reach 14 (index 0)
    fireEvent.click(decreaseBtn);

    expect(decreaseBtn).toBeDisabled();
    expect(
      screen.getByLabelText(/decrease font size \(minimum\)/i)
    ).toBeInTheDocument();
  });

  it("disables increase button at maximum size", () => {
    render(<FontSizeControl />);
    const increaseBtn = screen.getByRole("button", {
      name: /increase font size/i,
    });

    // Default is 16 (index 1), click twice to reach 20 (index 3)
    fireEvent.click(increaseBtn);
    fireEvent.click(increaseBtn);

    expect(increaseBtn).toBeDisabled();
    expect(
      screen.getByLabelText(/increase font size \(maximum\)/i)
    ).toBeInTheDocument();
  });

  it("does not go below minimum font size", () => {
    render(<FontSizeControl />);
    const decreaseBtn = screen.getByRole("button", {
      name: /decrease font size/i,
    });

    // Click decrease until at minimum
    fireEvent.click(decreaseBtn); // 16 -> 14
    fireEvent.click(decreaseBtn); // should stay at 14 (disabled)

    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("does not go above maximum font size", () => {
    render(<FontSizeControl />);
    const increaseBtn = screen.getByRole("button", {
      name: /increase font size/i,
    });

    fireEvent.click(increaseBtn); // 16 -> 18
    fireEvent.click(increaseBtn); // 18 -> 20
    fireEvent.click(increaseBtn); // should stay at 20 (disabled)

    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("persists font size to localStorage", () => {
    render(<FontSizeControl />);
    const increaseBtn = screen.getByRole("button", {
      name: /increase font size/i,
    });

    fireEvent.click(increaseBtn);

    expect(localStorage.getItem("planning-poker-font-size")).toBe("18");
  });

  it("restores font size from localStorage on mount", () => {
    localStorage.setItem("planning-poker-font-size", "20");

    render(<FontSizeControl />);

    expect(screen.getByText("20")).toBeInTheDocument();
    expect(document.documentElement.style.fontSize).toBe("20px");
  });

  it("ignores invalid localStorage values", () => {
    localStorage.setItem("planning-poker-font-size", "99");

    render(<FontSizeControl />);

    // Should fall back to default (16)
    expect(screen.getByText("16")).toBeInTheDocument();
  });
});
