import type { CreateSupportRequestInput } from "@/modules/support-requests/support-requests.interface.js";
import type {
  SupportRequestDocument,
  SupportRequestResponse,
} from "@/modules/support-requests/support-requests.type.js";

import { SupportRequestsRepository } from "@/modules/support-requests/support-requests.repository.js";
import { UsersRepository } from "@/modules/users/users.repository.js";
import { NotFoundException } from "@/utils/app-error.utils.js";

function toSupportRequestResponse(request: SupportRequestDocument): SupportRequestResponse {
  return {
    category: request.category,
    createdAt: request.createdAt,
    email: request.email,
    fullName: request.fullName,
    id: request.id,
    message: request.message,
    status: request.status,
    subject: request.subject,
    updatedAt: request.updatedAt,
  };
}

export class SupportRequestsService {
  constructor(
    private readonly supportRequestsRepository: SupportRequestsRepository = new SupportRequestsRepository(),
    private readonly usersRepository: UsersRepository = new UsersRepository(),
  ) {}

  async createSupportRequest(
    userId: string,
    input: CreateSupportRequestInput,
  ): Promise<SupportRequestResponse> {
    const user = await this.usersRepository.findActiveById(userId);
    if (!user)
      throw new NotFoundException("User not found.");

    const request = await this.supportRequestsRepository.createSupportRequest({
      category: input.category,
      email: input.email.trim().toLowerCase(),
      fullName: input.fullName.trim(),
      message: input.message.trim(),
      status: "open",
      subject: input.subject.trim(),
      userId,
    });

    return toSupportRequestResponse(request);
  }
}
