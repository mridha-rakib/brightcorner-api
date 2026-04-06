import { PasswordService } from "@/common/auth/password.service.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { buildFullName, normalizeEmail } from "@/modules/users/users.utils.js";

type SeedAdminInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
};

export type AdminSeedResult = "created" | "present" | "updated";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === 11000;
}

export class AdminSeedService {
  constructor(
    private readonly usersRepository: Pick<UsersRepository, "createUser" | "findByEmail"> = new UsersRepository(),
    private readonly passwordService: Pick<PasswordService, "hash"> = new PasswordService(),
  ) {}

  async seed(input: SeedAdminInput): Promise<AdminSeedResult> {
    const email = normalizeEmail(input.email);
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const fullName = buildFullName(firstName, lastName);
    let existingUser = await this.usersRepository.findByEmail(email);

    if (!existingUser) {
      const passwordHash = await this.passwordService.hash(input.password);

      try {
        await this.usersRepository.createUser({
          email,
          firstName,
          fullName,
          lastName,
          onboardingCompleted: true,
          passwordHash,
          role: "admin",
          status: "active",
        });

        return "created";
      }
      catch (error) {
        if (!isDuplicateKeyError(error))
          throw error;

        existingUser = await this.usersRepository.findByEmail(email);
      }
    }

    if (!existingUser)
      throw new Error("Admin seed failed after duplicate-email retry.");

    let hasUpdates = false;

    if (existingUser.firstName !== firstName) {
      existingUser.firstName = firstName;
      hasUpdates = true;
    }

    if (existingUser.lastName !== lastName) {
      existingUser.lastName = lastName;
      hasUpdates = true;
    }

    if (existingUser.fullName !== fullName) {
      existingUser.fullName = fullName;
      hasUpdates = true;
    }

    if (existingUser.role !== "admin") {
      existingUser.role = "admin";
      hasUpdates = true;
    }

    if (existingUser.status !== "active") {
      existingUser.status = "active";
      hasUpdates = true;
    }

    if (!existingUser.onboardingCompleted) {
      existingUser.onboardingCompleted = true;
      hasUpdates = true;
    }

    if (!hasUpdates)
      return "present";

    existingUser.passwordHash = await this.passwordService.hash(input.password);
    await existingUser.save();

    return "updated";
  }
}
