import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { act } from "react";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Test component that uses the theme
function TestComponent() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorageMock.clear();
    document.documentElement.className = "";
  });

  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div>Test Content</div>
      </ThemeProvider>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("uses default theme when no stored theme exists", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("light");
    });
  });

  it("loads theme from localStorage on mount", async () => {
    localStorageMock.setItem("planning-poker-theme", "dark");

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("current-theme")).toHaveTextContent("dark");
    });
  });

  it("persists theme changes to localStorage", async () => {
    const { getByText } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await act(async () => {
      getByText("Set Dark").click();
    });

    await waitFor(() => {
      expect(localStorageMock.getItem("planning-poker-theme")).toBe("dark");
    });
  });

  it("applies theme class to document root", async () => {
    const { getByText } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await act(async () => {
      getByText("Set Dark").click();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(document.documentElement.classList.contains("light")).toBe(false);
    });
  });

  it("switches between themes correctly", async () => {
    const { getByText } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await act(async () => {
      getByText("Set Dark").click();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    await act(async () => {
      getByText("Set Light").click();
    });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("light")).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("throws error when useTheme is used outside ThemeProvider", () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow("useTheme must be used within a ThemeProvider");

    console.error = originalError;
  });

  it("uses custom storage key", async () => {
    const { getByText } = render(
      <ThemeProvider storageKey="custom-theme-key">
        <TestComponent />
      </ThemeProvider>
    );

    await act(async () => {
      getByText("Set Dark").click();
    });

    await waitFor(() => {
      expect(localStorageMock.getItem("custom-theme-key")).toBe("dark");
    });
  });
});
