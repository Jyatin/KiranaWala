"use strict";

const { validateSeedEnvironment, seedData } = require("../scripts/seedDemoData");

describe("Seed Script Safety Guards", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test("1. Refuses to run when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_SEED_REMOTE;
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/kiranawala";

    expect(() => validateSeedEnvironment()).toThrow(
      /Seeding is blocked in production environment/
    );
  });

  test("2. Refuses to run when MONGO_URI points to remote database (not localhost / 127.0.0.1 / memory-server)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_SEED_REMOTE;
    process.env.MONGO_URI = "mongodb+srv://admin:pass@production-cluster.mongodb.net/kiranawala";

    expect(() => validateSeedEnvironment()).toThrow(
      /Seeding is blocked on non-local database/
    );
  });

  test("3. Allows execution when ALLOW_SEED_REMOTE=true even in production", () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOW_SEED_REMOTE = "true";
    process.env.MONGO_URI = "mongodb+srv://admin:pass@production-cluster.mongodb.net/kiranawala";

    expect(validateSeedEnvironment()).toBe(true);
  });

  test("4. Allows execution in development with localhost, 127.0.0.1, or mongodb-memory-server", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_SEED_REMOTE;

    process.env.MONGO_URI = "mongodb://localhost:27017/kiranawala_dev";
    expect(validateSeedEnvironment()).toBe(true);

    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/kiranawala_dev";
    expect(validateSeedEnvironment()).toBe(true);

    process.env.MONGO_URI = "mongodb://mongodb-memory-server:27017/kiranawala_dev";
    expect(validateSeedEnvironment()).toBe(true);
  });

  test("5. seedData() throws when safety check fails", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_SEED_REMOTE;
    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/kiranawala";

    await expect(seedData({ closeConnection: false })).rejects.toThrow(
      /Seeding is blocked in production environment/
    );
  });

  test("6. Refuses spoofed subdomain host (mongodb+srv://localhost.example.com/db)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_SEED_REMOTE;
    process.env.MONGO_URI = "mongodb+srv://localhost.example.com/db";

    expect(() => validateSeedEnvironment()).toThrow(
      /Seeding is blocked on non-local database/
    );
  });

  test("7. Refuses spoofed auth username (mongodb://user:localhost@db.example.com/db)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_SEED_REMOTE;
    process.env.MONGO_URI = "mongodb://user:localhost@db.example.com/db";

    expect(() => validateSeedEnvironment()).toThrow(
      /Seeding is blocked on non-local database/
    );
  });

  test("8. Allows legitimate local connection strings (mongodb://localhost:27017/db, ::1)", () => {
    process.env.NODE_ENV = "development";
    delete process.env.ALLOW_SEED_REMOTE;

    process.env.MONGO_URI = "mongodb://localhost:27017/db";
    expect(validateSeedEnvironment()).toBe(true);

    process.env.MONGO_URI = "mongodb://127.0.0.1:27017/db";
    expect(validateSeedEnvironment()).toBe(true);

    process.env.MONGO_URI = "mongodb://[::1]:27017/db";
    expect(validateSeedEnvironment()).toBe(true);
  });
});
