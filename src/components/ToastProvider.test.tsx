import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useToasts } from "@/components/ToastContext";
import { ToastProvider } from "@/components/ToastProvider";

describe("ToastProvider", () => {
  it("renders dismissible success and warning notifications", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>
    );

    await user.click(screen.getByRole("button", { name: "Show success" }));
    const savedToast = screen.getByRole("status");
    expect(within(savedToast).getByText("Saved")).toBeInTheDocument();
    expect(within(savedToast).getByText("Refreshing data.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show warning" }));
    const failedToast = screen.getByRole("alert");
    expect(within(failedToast).getByText("Failed")).toBeInTheDocument();
    expect(within(failedToast).getByText("Request ID: req-1")).toBeInTheDocument();

    await user.click(
      within(savedToast).getByRole("button", {
        name: "Dismiss notification: Saved",
      })
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

function ToastHarness() {
  const { notify } = useToasts();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          notify({
            tone: "success",
            title: "Saved",
            detail: "Refreshing data.",
          })
        }
      >
        Show success
      </button>
      <button
        type="button"
        onClick={() =>
          notify({
            tone: "warning",
            title: "Failed",
            detail: "Request ID: req-1",
          })
        }
      >
        Show warning
      </button>
    </>
  );
}
