import bcrypt from "bcryptjs";

import { env } from "@/env.js";

export class PasswordService {
  private readonly rounds = 12;

  async hash(password: string): Promise<string> {
    return bcrypt.hash(this.withPepper(password), this.rounds);
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(this.withPepper(password), passwordHash);
  }

  private withPepper(password: string): string {
    return `${password}${env.PASSWORD_PEPPER}`;
  }
}
