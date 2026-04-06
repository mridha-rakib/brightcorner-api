import type { SupportRequestCategory } from "@/modules/support-requests/support-requests.type.js";

import { SupportRequestModel } from "@/modules/support-requests/support-requests.model.js";

export class SupportRequestsRepository {
  createSupportRequest(payload: {
    category: SupportRequestCategory;
    email: string;
    fullName: string;
    message: string;
    status: "open";
    subject: string;
    userId: string;
  }) {
    return SupportRequestModel.create(payload);
  }
}
