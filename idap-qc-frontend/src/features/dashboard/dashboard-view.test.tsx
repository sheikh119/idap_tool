import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDashboardMetrics, projects } from "@/mocks/fixtures";
import { dashboardApi, projectApi } from "@/services/api";
import { DashboardView } from "./dashboard-view";

const replace = vi.fn();
let search = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), back: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => search,
}));

vi.mock("@/services/api", () => ({
  projectApi: { list: vi.fn(), packages: vi.fn(), create: vi.fn() },
  dashboardApi: { get: vi.fn() },
}));

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardView />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  search = new URLSearchParams();
  vi.mocked(projectApi.list).mockResolvedValue(structuredClone(projects));
  vi.mocked(projectApi.packages).mockResolvedValue([]);
  vi.mocked(dashboardApi.get).mockImplementation(async (filters) => buildDashboardMetrics(filters));
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DashboardView", () => {
  it("shows a loading skeleton before metrics arrive", async () => {
    vi.mocked(dashboardApi.get).mockReturnValue(new Promise(() => {}));
    renderDashboard();

    expect(await screen.findByRole("status", { name: "Loading dashboard" })).toBeTruthy();
  });

  it("shows metrics for the first project by default", async () => {
    renderDashboard();

    expect(await screen.findByText("Open issues")).toBeTruthy();
    expect(dashboardApi.get).toHaveBeenCalledWith({ projectId: "p1", packageId: undefined });
  });

  it("offers a retry when the dashboard fails to load", async () => {
    vi.mocked(dashboardApi.get).mockRejectedValueOnce(new Error("network"));
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Open issues")).toBeTruthy();
    expect(dashboardApi.get).toHaveBeenCalledTimes(2);
  });

  it("offers a retry when projects fail to load", async () => {
    vi.mocked(projectApi.list).mockRejectedValueOnce(new Error("network"));
    renderDashboard();

    expect(await screen.findByText("Projects could not be loaded")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(await screen.findByText("Open issues")).toBeTruthy();
  });

  it("guides the user to create a project when none exist", async () => {
    vi.mocked(projectApi.list).mockResolvedValue([]);
    renderDashboard();

    expect(await screen.findByText("No projects yet")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /add project/i })).toHaveLength(1);
    expect(dashboardApi.get).not.toHaveBeenCalled();
  });

  it("guides the user to record the first issue in an empty project", async () => {
    search = new URLSearchParams("project=p2");
    renderDashboard();

    expect(await screen.findByText("No QC activity in this project yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: /record first issue/i }).getAttribute("href")).toBe(
      "/projects/p2/issues/new",
    );
  });

  it("links each number to the matching filtered list, keeping the package", async () => {
    search = new URLSearchParams("project=p1&package=pk1");
    vi.mocked(projectApi.packages).mockResolvedValue([
      { id: "pk1", projectId: "p1", code: "STR", name: "Structural works", status: "ACTIVE" },
    ]);
    renderDashboard();

    const critical = await screen.findByRole("link", { name: /unresolved critical/i });
    expect(critical.getAttribute("href")).toBe(
      "/projects/p1/issues?package=pk1&severity=CRITICAL&status=OPEN,IN_PROGRESS",
    );
    expect(screen.getByRole("link", { name: /awaiting review/i }).getAttribute("href")).toBe(
      "/projects/p1/reports?package=pk1&status=SUBMITTED,UNDER_REVIEW",
    );
    expect(screen.getByRole("link", { name: /high issues/i }).getAttribute("href")).toBe(
      "/projects/p1/issues?package=pk1&severity=HIGH",
    );
  });

  it("offers quick actions for the selected project", async () => {
    search = new URLSearchParams("project=p2");
    renderDashboard();

    expect((await screen.findByRole("link", { name: /^new issue$/i })).getAttribute("href")).toBe("/projects/p2/issues/new");
    expect(screen.getByRole("link", { name: /^new report$/i }).getAttribute("href")).toBe("/projects/p2/reports/new");
  });

  it("offers to clear an empty package filter", async () => {
    search = new URLSearchParams("project=p1&package=pk2");
    vi.mocked(projectApi.packages).mockResolvedValue([
      { id: "pk2", projectId: "p1", code: "FIN", name: "Finishing works", status: "ACTIVE" },
    ]);
    vi.mocked(dashboardApi.get).mockImplementation(async () => buildDashboardMetrics({ projectId: "empty" }));
    renderDashboard();

    fireEvent.click(await screen.findByRole("button", { name: /show all packages/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard?project=p1", { scroll: false }));
  });
});
