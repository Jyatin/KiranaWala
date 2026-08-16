const User = require("../models/user");
const bcrypt = require("bcryptjs");

describe("User Model", () => {
  test("hashPassword should hash a plain-text password", async () => {
    const plainPassword = "password123";
    const hashed = await User.hashPassword(plainPassword);

    expect(hashed).not.toBe(plainPassword);
    expect(hashed).toMatch(/^\$2[aby]\$/);
    expect(bcrypt.compareSync(plainPassword, hashed)).toBe(true);
  });

  test("hashPassword should not re-hash an already-hashed password", async () => {
    const plainPassword = "password123";
    const hashedOnce = await User.hashPassword(plainPassword);
    const hashedTwice = await User.hashPassword(hashedOnce);

    expect(hashedTwice).toBe(hashedOnce);
  });

  test("comparePassword should correctly validate a hashed password", async () => {
    const plainPassword = "anotherPassword456";
    const user = new User({
      username: "test_compare_user",
      email: "user_compare@example.com",
      password: await User.hashPassword(plainPassword),
      role: "customer",
    });

    await expect(user.comparePassword(plainPassword)).resolves.toBe(true);
    await expect(user.comparePassword("wrongPassword")).resolves.toBe(false);
  });

  test("should accept customer, store-owner, and admin as valid roles", () => {
    for (const role of ["customer", "store-owner", "admin"]) {
      const user = new User({
        username: `user_${role}`,
        email: `${role}@example.com`,
        password: "password123",
        role,
      });
      expect(user.validateSync()).toBeUndefined();
    }
  });

  test("should reject an invalid role", () => {
    const invalidUser = new User({
      username: "bad_role_user",
      email: "bad_role@example.com",
      password: "password123",
      role: "super-admin",
    });
    const error = invalidUser.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
  });

  test("should require username, email, and password", () => {
    const incompleteUser = new User({ role: "customer" });
    const error = incompleteUser.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.username).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });
});
