import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/components/theme-provider";

function renderWithTheme(defaultTheme: "light" | "dark" | "system" = "light") {
  return render(
    <ThemeProvider defaultTheme={defaultTheme} storageKey="test-theme">
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  it("renders a button", () => {
    renderWithTheme();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it('shows "Switch to dark mode" label when theme is light', () => {
    renderWithTheme("light");
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  it('shows "Switch to system mode" label when theme is dark', () => {
    renderWithTheme("dark");
    expect(screen.getByLabelText("Switch to system mode")).toBeInTheDocument();
  });

  it('shows "Switch to light mode" label when theme is system', () => {
    renderWithTheme("system");
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("cycles from light to dark on click", () => {
    renderWithTheme("light");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByLabelText("Switch to system mode")).toBeInTheDocument();
  });

  it("cycles from dark to system on click", () => {
    renderWithTheme("dark");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });

  it("cycles from system to light on click", () => {
    renderWithTheme("system");
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  it("cycles through all three themes in order", () => {
    renderWithTheme("light");
    const button = screen.getByRole("button");

    // light -> dark
    fireEvent.click(button);
    expect(screen.getByLabelText("Switch to system mode")).toBeInTheDocument();

    // dark -> system
    fireEvent.click(button);
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();

    // system -> light
    fireEvent.click(button);
    expect(screen.getByLabelText("Switch to dark mode")).toBeInTheDocument();
  });

  it("renders an SVG icon for each theme", () => {
    const { container, rerender } = render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(container.querySelector("svg")).toBeInTheDocument();

    rerender(
      <ThemeProvider defaultTheme="dark" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(container.querySelector("svg")).toBeInTheDocument();

    rerender(
      <ThemeProvider defaultTheme="system" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("persists theme to localStorage on click", () => {
    localStorage.clear();
    renderWithTheme("light");
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem("test-theme")).toBe("dark");
  });
});
