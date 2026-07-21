// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("database transport configuration", () => {
  const originalTransport = process.env.DATABASE_TRANSPORT;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const originalUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  beforeEach(() => {
    process.env.DATABASE_URL =
      "postgresql://user:password@example.com/database";
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = "test-preset";
  });

  afterEach(() => {
    if (originalTransport === undefined) {
      delete process.env.DATABASE_TRANSPORT;
    } else {
      process.env.DATABASE_TRANSPORT = originalTransport;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    if (originalCloudName === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    } else {
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloudName;
    }
    if (originalUploadPreset === undefined) {
      delete process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    } else {
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET = originalUploadPreset;
    }
    vi.resetModules();
  });

  it("defaults to TCP when no transport is configured", async () => {
    delete process.env.DATABASE_TRANSPORT;
    vi.resetModules();

    const { env } = await import("~/env");

    expect(env.DATABASE_TRANSPORT).toBe("tcp");
  });

  it("accepts WebSocket transport for local development", async () => {
    process.env.DATABASE_TRANSPORT = "websocket";
    vi.resetModules();

    const { env } = await import("~/env");

    expect(env.DATABASE_TRANSPORT).toBe("websocket");
  });
});
