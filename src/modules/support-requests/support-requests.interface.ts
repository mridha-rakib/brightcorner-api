import type { SupportRequestCategory } from "@/modules/support-requests/support-requests.type.js";

export type CreateSupportRequestInput = {
  category: SupportRequestCategory;
  email: string;
  fullName: string;
  message: string;
  subject: string;
};
