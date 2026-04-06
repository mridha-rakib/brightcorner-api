import { describe, expect, it, vi } from "vitest";

import { AdminSeedService } from "../src/modules/admin/admin-seed.service.js";

describe("AdminSeedService", () => {
  it("creates a new admin user when the seed email does not exist", async () => {
    const repository = {
      createUser: vi.fn().mockResolvedValue({}),
      findByEmail: vi.fn().mockResolvedValue(null),
    };
    const passwordService = {
      hash: vi.fn().mockResolvedValue("hashed-password"),
    };

    const service = new AdminSeedService(repository as never, passwordService as never);

    const result = await service.seed({
      email: "Blaisetemateh@gmail.com",
      firstName: "Blaise",
      lastName: "Temateh",
      password: "BrightCornerAdmin@123",
    });

    expect(result).toBe("created");
    expect(passwordService.hash).toHaveBeenCalledWith("BrightCornerAdmin@123");
    expect(repository.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "blaisetemateh@gmail.com",
        firstName: "Blaise",
        fullName: "Blaise Temateh",
        lastName: "Temateh",
        onboardingCompleted: true,
        passwordHash: "hashed-password",
        role: "admin",
        status: "active",
      }),
    );
  });

  it("updates an existing non-admin user without creating a duplicate record", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const existingUser = {
      email: "blaisetemateh@gmail.com",
      firstName: "Existing",
      fullName: "Existing User",
      lastName: "User",
      onboardingCompleted: false,
      passwordHash: undefined,
      role: "user",
      save,
      status: "blocked",
    };
    const repository = {
      createUser: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(existingUser),
    };
    const passwordService = {
      hash: vi.fn().mockResolvedValue("updated-hash"),
    };

    const service = new AdminSeedService(repository as never, passwordService as never);

    const result = await service.seed({
      email: "Blaisetemateh@gmail.com",
      firstName: "Blaise",
      lastName: "Temateh",
      password: "BrightCornerAdmin@123",
    });

    expect(result).toBe("updated");
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(passwordService.hash).toHaveBeenCalledWith("BrightCornerAdmin@123");
    expect(existingUser.role).toBe("admin");
    expect(existingUser.status).toBe("active");
    expect(existingUser.onboardingCompleted).toBe(true);
    expect(existingUser.firstName).toBe("Blaise");
    expect(existingUser.lastName).toBe("Temateh");
    expect(existingUser.fullName).toBe("Blaise Temateh");
    expect(existingUser.passwordHash).toBe("updated-hash");
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the admin account is already present", async () => {
    const save = vi.fn();
    const repository = {
      createUser: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue({
        email: "blaisetemateh@gmail.com",
        firstName: "Blaise",
        fullName: "Blaise Temateh",
        lastName: "Temateh",
        onboardingCompleted: true,
        passwordHash: "existing-hash",
        role: "admin",
        save,
        status: "active",
      }),
    };
    const passwordService = {
      hash: vi.fn(),
    };

    const service = new AdminSeedService(repository as never, passwordService as never);

    const result = await service.seed({
      email: "Blaisetemateh@gmail.com",
      firstName: "Blaise",
      lastName: "Temateh",
      password: "BrightCornerAdmin@123",
    });

    expect(result).toBe("present");
    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(repository.createUser).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("recovers from a duplicate-key race without creating a second admin account", async () => {
    const existingUser = {
      email: "blaisetemateh@gmail.com",
      firstName: "Blaise",
      fullName: "Blaise Temateh",
      lastName: "Temateh",
      onboardingCompleted: true,
      passwordHash: "existing-hash",
      role: "admin",
      save: vi.fn(),
      status: "active",
    };
    const repository = {
      createUser: vi.fn().mockRejectedValue({ code: 11000 }),
      findByEmail: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingUser),
    };
    const passwordService = {
      hash: vi.fn().mockResolvedValue("hashed-password"),
    };

    const service = new AdminSeedService(repository as never, passwordService as never);

    const result = await service.seed({
      email: "Blaisetemateh@gmail.com",
      firstName: "Blaise",
      lastName: "Temateh",
      password: "BrightCornerAdmin@123",
    });

    expect(result).toBe("present");
    expect(repository.createUser).toHaveBeenCalledTimes(1);
    expect(repository.findByEmail).toHaveBeenCalledTimes(2);
    expect(existingUser.save).not.toHaveBeenCalled();
  });
});
