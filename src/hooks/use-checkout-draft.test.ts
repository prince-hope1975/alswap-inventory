import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCheckoutDraft } from "./use-checkout-draft";

beforeEach(() => sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("checkout draft", () => {
  it("restores details and fulfilment after closing and reopening checkout", async () => {
    const first = renderHook(() => useCheckoutDraft("store-a"));
    await waitFor(() => expect(first.result.current.ready).toBe(true));
    act(() =>
      first.result.current.update({
        details: {
          name: "Ada",
          phone: "08012345678",
          email: "ada@example.test",
        },
        deliveryAddress: "Jeddo road",
        deliveryChoice: "DELIVERY",
        paymentChoice: "PAYSTACK",
      }),
    );
    first.unmount();
    const reopened = renderHook(() => useCheckoutDraft("store-a"));
    await waitFor(() =>
      expect(reopened.result.current.draft.details.name).toBe("Ada"),
    );
    expect(reopened.result.current.draft).toMatchObject({
      deliveryAddress: "Jeddo road",
      deliveryChoice: "DELIVERY",
      paymentChoice: "PAYSTACK",
    });
  });
  it("does not expose or overwrite another tenant's details", async () => {
    sessionStorage.setItem(
      "alswap-checkout:v1:store-a",
      JSON.stringify({
        details: { name: "Ada", phone: "08012345678", email: "" },
        deliveryChoice: "PICKUP",
        paymentChoice: null,
        deliveryAddress: "",
      }),
    );
    const { result, rerender } = renderHook(
      ({ tenant }) => useCheckoutDraft(tenant),
      { initialProps: { tenant: "store-a" } },
    );
    await waitFor(() => expect(result.current.draft.details.name).toBe("Ada"));
    rerender({ tenant: "store-b" });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.draft.details.name).toBe("");
    expect(sessionStorage.getItem("alswap-checkout:v1:store-a")).toContain(
      '"name":"Ada"',
    );
  });
  it("clears persistence after success without deleting the displayed receipt details", async () => {
    const { result, unmount } = renderHook(() => useCheckoutDraft("store-a"));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() =>
      result.current.update({
        details: { name: "Ada", email: "", phone: "08012345678" },
      }),
    );
    act(() => result.current.clear());
    expect(sessionStorage.getItem("alswap-checkout:v1:store-a")).toBeNull();
    expect(result.current.draft.details.name).toBe("Ada");
    unmount();
    const next = renderHook(() => useCheckoutDraft("store-a"));
    await waitFor(() => expect(next.result.current.ready).toBe(true));
    expect(next.result.current.draft.details.name).toBe("");
  });
  it("recovers from corrupt data and blocked storage", async () => {
    sessionStorage.setItem("alswap-checkout:v1:store-a", "bad-json");
    const one = renderHook(() => useCheckoutDraft("store-a"));
    await waitFor(() => expect(one.result.current.ready).toBe(true));
    expect(one.result.current.draft.details.name).toBe("");
    one.unmount();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const two = renderHook(() => useCheckoutDraft("store-b"));
    await waitFor(() => expect(two.result.current.ready).toBe(true));
    act(() => two.result.current.update({ deliveryAddress: "Working form" }));
    expect(two.result.current.draft.deliveryAddress).toBe("Working form");
  });
});
