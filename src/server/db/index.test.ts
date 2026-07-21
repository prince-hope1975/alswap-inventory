// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  neonDrizzle: vi.fn(() => ({ driver: "websocket" })),
  neonPool: vi.fn(() => ({ driver: "websocket-pool" })),
  postgres: vi.fn(() => ({ driver: "tcp-client" })),
  postgresDrizzle: vi.fn(() => ({ driver: "tcp" })),
  transport: "websocket" as "tcp" | "websocket",
}));

vi.mock("~/env", () => ({
  env: {
    get DATABASE_TRANSPORT() {
      return mocks.transport;
    },
    DATABASE_URL: "postgresql://user:password@example.com/database",
    NODE_ENV: "test",
  },
}));

vi.mock("@neondatabase/serverless", () => ({
  neonConfig: {},
  Pool: mocks.neonPool,
}));

vi.mock("drizzle-orm/neon-serverless", () => ({ drizzle: mocks.neonDrizzle }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: mocks.postgresDrizzle }));
vi.mock("postgres", () => ({ default: mocks.postgres }));
vi.mock("ws", () => ({ default: class MockWebSocket {} }));
vi.mock("~/server/db/schema", () => ({}));

describe("database client", () => {
  beforeEach(() => {
    mocks.transport = "websocket";
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses Neon WebSocket transport when configured", async () => {
    await import("~/server/db");

    expect(mocks.neonPool).toHaveBeenCalledWith({
      connectionString: "postgresql://user:password@example.com/database",
    });
    expect(mocks.neonDrizzle).toHaveBeenCalledOnce();
    expect(mocks.postgres).not.toHaveBeenCalled();
  });

  it("keeps Postgres.js TCP transport as the deployment default", async () => {
    mocks.transport = "tcp";

    await import("~/server/db");

    expect(mocks.postgres).toHaveBeenCalledWith(
      "postgresql://user:password@example.com/database",
    );
    expect(mocks.postgresDrizzle).toHaveBeenCalledOnce();
    expect(mocks.neonPool).not.toHaveBeenCalled();
  });
});
