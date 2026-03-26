import type { LegalContentType } from "@/modules/legal-content/legal-content.type.js";

export type UpdateLegalContentInput = {
  type: LegalContentType;
  title?: string;
  content: string;
  updatedBy: string;
};
