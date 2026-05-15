import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { Layout } from "@/components/Layout";

describe("Layout", () => {
  it("renders platform navigation and routes the platforms outlet", () => {
    render(
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
    render(
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
    render(
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
});
