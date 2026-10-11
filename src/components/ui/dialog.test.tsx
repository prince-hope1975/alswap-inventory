import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import { ConfirmProvider, useConfirm } from "./confirm-dialog";
import { Dialog } from "./dialog";

function Harness({ onClose = () => undefined }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog
        open={open}
        title="Edit thing"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <input aria-label="Name" />
        <button>Save</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("is a labelled modal that takes focus and locks scroll", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog", { name: "Edit thing" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes on Escape, restores focus and unlocks scroll", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByText("Open");
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("traps Tab inside the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByText("Open"));
    const close = screen.getByRole("button", { name: "Close" });
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.keyDown(save, { key: "Tab" });
    expect(close).toHaveFocus();
    fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
    expect(save).toHaveFocus();
  });

  it("does not submit an enclosing form", () => {
    const outerSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={outerSubmit}>
        <Dialog open title="Inner" onClose={() => undefined}>
          <form onSubmit={(e) => e.preventDefault()}>
            <button type="submit">Inner submit</button>
          </form>
        </Dialog>
      </form>,
    );
    fireEvent.click(screen.getByText("Inner submit"));
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});

function ConfirmHarness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button onClick={async () => onResult(await confirm({ title: "Delete it?", destructive: true, confirmLabel: "Delete" }))}>
      Ask
    </button>
  );
}

describe("useConfirm", () => {
  it("resolves true on confirm and false on cancel", async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <ConfirmHarness onResult={onResult} />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByText("Ask"));
    expect(screen.getByRole("dialog", { name: "Delete it?" })).toBeInTheDocument();
    // Cancel gets initial focus so Enter can't destroy by accident.
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    expect(onResult).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByText("Ask"));
    await act(async () => fireEvent.keyDown(document.activeElement!, { key: "Escape" }));
    expect(onResult).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
