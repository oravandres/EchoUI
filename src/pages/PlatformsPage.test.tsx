import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AdminSession,
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";
import {
  createPlatform,
  deletePlatform,
  type PlatformConnection,
  listPlatforms,
  updatePlatform,
} from "@/api/platforms";
import { ToastProvider } from "@/components/ToastProvider";
import { PlatformsPage } from "@/pages/PlatformsPage";
import { ApiError } from "@/api/client";

vi.mock("@/api/adminSession", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/adminSession")>(
      "@/api/adminSession"
    );
  return {
    ...actual,
    getAdminSession: vi.fn(),
    loginAdminSession: vi.fn(),
    logoutAdminSession: vi.fn(),
  };
});

vi.mock("@/api/platforms", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/platforms")>(
      "@/api/platforms"
    );
  return {
    ...actual,
    listPlatforms: vi.fn(),
    createPlatform: vi.fn(),
    updatePlatform: vi.fn(),
    deletePlatform: vi.fn(),
  };
});

const getAdminSessionMock = vi.mocked(getAdminSession);
const loginAdminSessionMock = vi.mocked(loginAdminSession);
const logoutAdminSessionMock = vi.mocked(logoutAdminSession);
const listPlatformsMock = vi.mocked(listPlatforms);
const createPlatformMock = vi.mocked(createPlatform);
const updatePlatformMock = vi.mocked(updatePlatform);
const deletePlatformMock = vi.mocked(deletePlatform);

describe("PlatformsPage", () => {
  beforeEach(() => {
    getAdminSessionMock.mockResolvedValue(unauthenticatedSession);
    loginAdminSessionMock.mockResolvedValue(authenticatedSession);
    logoutAdminSessionMock.mockResolvedValue(undefined);
    listPlatformsMock.mockResolvedValue(platformsResponse([]));
    createPlatformMock.mockResolvedValue(xPlatform);
    updatePlatformMock.mockResolvedValue(xPlatform);
    deletePlatformMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state", () => {
    listPlatformsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      screen.getByRole("status", { name: "Loading platforms" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Admin token")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("renders connected platform health", async () => {
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", { name: "Main X" })
    ).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("x - @echo.test")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Manage Main X" })
    ).not.toBeInTheDocument();
  });

  it("maps disabled platform connections to a stable disabled label", async () => {
    listPlatformsMock.mockResolvedValue(
      platformsResponse([{ ...xPlatform, enabled: false }])
    );

    renderWithQueryClient(<PlatformsPage />);

    expect(await screen.findByText("Disabled")).toBeInTheDocument();
  });

  it("renders an empty state when Echo reports no platform connections", async () => {
    listPlatformsMock.mockResolvedValue(platformsResponse([]));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", { name: "No platforms connected" })
    ).toBeInTheDocument();
  });

  it("renders stable unavailable copy for an initial load error", async () => {
    listPlatformsMock.mockRejectedValue(new Error("internal token value"));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Platform status is unavailable",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/internal token/i)).not.toBeInTheDocument();
  });

  it("keeps cached platform data visible when a refresh fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(
      ["platforms", "list"],
      platformsResponse([xPlatform])
    );
    listPlatformsMock.mockRejectedValue(new Error("temporary outage"));

    renderWithQueryClient(<PlatformsPage />, client);

    expect(screen.getByRole("heading", { name: "Main X" })).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh platform status. Showing last known data.",
      })
    ).toBeInTheDocument();
  });

  it("unlocks the add form and creates an X platform connection", async () => {
    const user = userEvent.setup();
    listPlatformsMock.mockResolvedValue(platformsResponse([]));

    renderWithQueryClient(<PlatformsPage />);

    await user.type(screen.getByLabelText("Admin token"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(loginAdminSessionMock).toHaveBeenCalledWith("secret");
    });

    await user.clear(await screen.findByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Echo X");
    await user.type(screen.getByLabelText("X access token"), "x-token");
    await user.click(screen.getByRole("button", { name: "Add platform" }));

    await waitFor(() => {
      expect(createPlatformMock).toHaveBeenCalledWith(
        {
          platform: "x",
          displayName: "Echo X",
          credentials: { accessToken: "x-token" },
          enabled: true,
        },
        { csrfToken: "csrf-1" }
      );
    });
    expect(
      await screen.findByText("Platform connection added.")
    ).toBeInTheDocument();
  });

  it("shows management controls after admin unlock", async () => {
    const user = userEvent.setup();
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));

    renderWithQueryClient(<PlatformsPage />);

    expect(await screen.findByText("Healthy")).toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Manage Main X" })
    ).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Admin token"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    expect(
      within(manageForm).getByRole("button", { name: "Save changes" })
    ).toBeDisabled();
    expect(
      within(manageForm).getByRole("button", {
        name: "Delete platform Main X",
      })
    ).toBeInTheDocument();
  });

  it("updates only changed display name fields and refreshes dependent queries", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    updatePlatformMock.mockResolvedValue({ ...xPlatform, displayName: "Renamed X" });
    const user = userEvent.setup();
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    renderWithQueryClient(<PlatformsPage />, client);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    const nameInput = within(manageForm).getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed X");
    await user.click(within(manageForm).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updatePlatformMock).toHaveBeenCalledWith(
        "platform-1",
        { displayName: "Renamed X" },
        { csrfToken: "csrf-1" }
      );
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["platforms"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["stats"] });
    expect(await screen.findByText("Platform updated.")).toBeInTheDocument();
  });

  it("updates enabled state and rotates credentials only when requested", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    updatePlatformMock.mockResolvedValue({ ...xPlatform, enabled: false });
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    await user.click(within(manageForm).getByLabelText("Enabled"));
    await user.type(
      within(manageForm).getByLabelText("New X access token"),
      "rotated-token"
    );
    await user.click(within(manageForm).getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updatePlatformMock).toHaveBeenCalledWith(
        "platform-1",
        {
          enabled: false,
          credentials: { accessToken: "rotated-token" },
        },
        { csrfToken: "csrf-1" }
      );
    });
    await waitFor(() => {
      expect(within(manageForm).getByLabelText("New X access token")).toHaveValue("");
    });
  });

  it("requires two clicks before deleting a platform", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    await user.click(
      within(manageForm).getByRole("button", {
        name: "Delete platform Main X",
      })
    );
    expect(deletePlatformMock).not.toHaveBeenCalled();

    await user.click(
      within(manageForm).getByRole("button", {
        name: "Confirm delete platform Main X",
      })
    );

    await waitFor(() => {
      expect(deletePlatformMock).toHaveBeenCalledWith("platform-1", {
        csrfToken: "csrf-1",
      });
    });
    expect(await screen.findByText("Platform deleted.")).toBeInTheDocument();
  });

  it("does not leak update errors and clears credential input", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    updatePlatformMock.mockRejectedValue(new Error("raw access token invalid"));
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    const tokenInput = within(manageForm).getByLabelText("New X access token");
    await user.type(tokenInput, "bad-token");
    await user.click(within(manageForm).getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findAllByText("Echo could not update the platform.")
    ).not.toHaveLength(0);
    expect(screen.queryByText(/raw access token/i)).not.toBeInTheDocument();
    expect(tokenInput).toHaveValue("");
  });

  it("does not leak delete errors", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    deletePlatformMock.mockRejectedValue(new Error("foreign key constraint failed"));
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    await user.click(
      within(manageForm).getByRole("button", {
        name: "Delete platform Main X",
      })
    );
    await user.click(
      within(manageForm).getByRole("button", {
        name: "Confirm delete platform Main X",
      })
    );

    expect(
      await screen.findAllByText("Echo could not delete the platform.")
    ).not.toHaveLength(0);
    expect(screen.queryByText(/foreign key/i)).not.toBeInTheDocument();
  });

  it("locks the admin session after management auth errors", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    updatePlatformMock.mockRejectedValue(
      new ApiError("raw auth failure", 401, undefined)
    );
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    const manageForm = await screen.findByRole("form", { name: "Manage Main X" });
    const nameInput = within(manageForm).getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Renamed X");
    await user.click(within(manageForm).getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findAllByText("Echo could not update the platform.")
    ).not.toHaveLength(0);
    await waitFor(() => {
      expect(
        screen.queryByRole("form", { name: "Manage Main X" })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("does not leak platform credential validation errors", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    createPlatformMock.mockRejectedValue(new Error("raw access token invalid"));
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    await user.type(await screen.findByLabelText("X access token"), "bad-token");
    await user.click(screen.getByRole("button", { name: "Add platform" }));

    expect(
      await screen.findAllByText("Echo could not add the platform.")
    ).not.toHaveLength(0);
    expect(screen.queryByText(/raw access token/i)).not.toBeInTheDocument();
  });
});

const unauthenticatedSession: AdminSession = {
  authenticated: false,
  csrfToken: "",
  expiresAt: "",
};

const authenticatedSession: AdminSession = {
  authenticated: true,
  csrfToken: "csrf-1",
  expiresAt: "2026-05-15T00:00:00Z",
};

const xPlatform: PlatformConnection = {
  id: "platform-1",
  platform: "x",
  displayName: "Main X",
  accountHandle: "@echo.test",
  enabled: true,
  lastCheckedAt: "2026-05-12T17:00:00Z",
  lastHealthStatus: "healthy",
};

function platformsResponse(items: PlatformConnection[]) {
  return {
    data: items,
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithQueryClient(
  ui: ReactNode,
  client = createTestQueryClient()
) {
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>{ui}</ToastProvider>
    </QueryClientProvider>
  );
}
