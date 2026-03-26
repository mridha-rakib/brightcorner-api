import type { HydratedDocument } from "mongoose";

export type LegalContentType = "privacy" | "terms" | "about";

export type LegalContent = {
  type: LegalContentType;
  title: string;
  content: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LegalContentDocument = HydratedDocument<LegalContent>;
