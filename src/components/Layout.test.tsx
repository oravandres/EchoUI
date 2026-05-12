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
});
