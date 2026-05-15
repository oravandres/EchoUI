import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useTheme } from "@/components/ThemeContext";
import { ThemeProvider } from "@/components/ThemeProvider";

describe("ThemeProvider", () => {
  it("defaults to dark theme and persists a light theme toggle", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem("echoui.theme")).toBe("light");
  });

  it("uses a stored light theme on initial render", () => {
    window.localStorage.setItem("echoui.theme", "light");

    render(
      <ThemeProvider>
        <ThemeHarness />
      </ThemeProvider>
    );

    expect(screen.getByText("light")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

function ThemeHarness() {
  const { theme, toggleTheme } = useTheme();
  return (
    <>
      <p>{theme}</p>
      <button type="button" onClick={toggleTheme}>
        Toggle theme
      </button>
    </>
  );
}
