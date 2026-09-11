// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersPage from "./page";
import { api } from "@/lib/api";
vi.mock("@/lib/api", () => ({ api: vi.fn() }));
vi.mock("@/components/toast", () => ({
  useToast: () => ({ notify: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("User moderation confirmation", () => {
  it.each([
    ["ACTIVE", "Suspend", "Suspend account", "SUSPENDED"],
    ["SUSPENDED", "Reactivate", "Reactivate account", "ACTIVE"],
  ])(
    "confirms the actual action for %s accounts",
    async (accountStatus, action, title, target) => {
      vi.mocked(api).mockImplementation(async (path, options) => {
        if (path === "auth/me")
          return {
            id: "admin",
            email: "admin@example.com",
            role: "ADMIN",
          } as never;
        if (options?.method === "PATCH") return {} as never;
        return {
          items: [
            {
              id: "member",
              email: "member@example.com",
              role: "USER",
              accountStatus,
              createdAt: "2026-01-01",
              emailVerified: true,
              profile: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
        } as never;
      });
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidation = vi.spyOn(client, "invalidateQueries");
      render(
        <QueryClientProvider client={client}>
          <UsersPage />
        </QueryClientProvider>,
      );
      fireEvent.click(
        await screen.findByRole("button", { name: action }),
      );
      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByRole("heading").textContent).toBe(title);
      fireEvent.change(within(dialog).getByRole("textbox"), {
        target: { value: "Reviewed case" },
      });
      fireEvent.click(
        within(dialog).getByRole("button", { name: title }),
      );
      await waitFor(() =>
        expect(api).toHaveBeenCalledWith(
          "admin/users/member/status",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ status: target, reason: "Reviewed case" }),
          }),
        ),
      );
      await waitFor(() =>
        expect(invalidation).toHaveBeenCalledWith({ queryKey: ["overview"] }),
      );
      client.clear();
    },
  );
});
