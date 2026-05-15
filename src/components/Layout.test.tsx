import { render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { Layout } from "@/components/Layout";
import { ThemeProvider } from "@/components/ThemeProvider";

describe("Layout", () => {
  it("renders platform navigation and routes the platforms outlet", () => {
    renderWithTheme(
      <MemoryRouter initialEntries={["/platforms"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="platforms" element={<h1>Platforms page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: /platforms/i });

    expect(link).toHaveAttribute("href", "/platforms");
    expect(link).toHaveClass("active");
    expect(
      screen.getByRole("heading", { name: "Platforms page" })
    ).toBeInTheDocument();
  });

  it("renders post navigation and routes the posts outlet", () => {
    renderWithTheme(
      <MemoryRouter initialEntries={["/posts"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="posts" element={<h1>Posts page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: /posts/i });

    expect(link).toHaveAttribute("href", "/posts");
    expect(link).toHaveClass("active");
    expect(
      screen.getByRole("heading", { name: "Posts page" })
    ).toBeInTheDocument();
  });

  it("renders stats navigation and routes the stats outlet", () => {
    renderWithTheme(
      <MemoryRouter initialEntries={["/stats"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route path="stats" element={<h1>Stats page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "Main" });
    const link = within(nav).getByRole("link", { name: /stats/i });

    expect(link).toHaveAttribute("href", "/stats");
    expect(link).toHaveClass("active");
    expect(
      screen.getByRole("heading", { name: "Stats page" })
    ).toBeInTheDocument();
  });

  it("renders a theme toggle in the app shell", () => {
    renderWithTheme(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<h1>Dashboard page</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(
      screen.getByRole("button", { name: "Switch to light theme" })
    ).toHaveAttribute("aria-pressed", "false");
  });
});

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}
