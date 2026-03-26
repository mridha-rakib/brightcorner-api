import { model, models, Schema } from "mongoose";

import type { LegalContent } from "@/modules/legal-content/legal-content.type.js";

const legalContentSchema = new Schema<LegalContent>({
  type: {
    type: String,
    required: true,
    enum: ["privacy", "terms", "about"],
    unique: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
    trim: true,
  },
  updatedBy: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  versionKey: false,
});

export const LegalContentModel = models.LegalContent || model<LegalContent>("LegalContent", legalContentSchema);
