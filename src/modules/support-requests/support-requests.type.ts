import type { HydratedDocument, Types } from "mongoose";

export type SupportRequestCategory
  = "general_inquiry"
    | "technical_support"
    | "billing_question"
    | "feedback";

export type SupportRequestStatus = "open";

export type SupportRequest = {
  category: SupportRequestCategory;
  createdAt: Date;
  email: string;
  fullName: string;
  message: string;
  status: SupportRequestStatus;
  subject: string;
  updatedAt: Date;
  userId: Types.ObjectId;
};

export type SupportRequestResponse = {
  category: SupportRequestCategory;
  createdAt: Date;
  email: string;
  fullName: string;
  id: string;
  message: string;
  status: SupportRequestStatus;
  subject: string;
  updatedAt: Date;
};

export type SupportRequestDocument = HydratedDocument<SupportRequest>;
