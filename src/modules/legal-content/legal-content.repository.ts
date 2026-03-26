import type { LegalContentType } from "@/modules/legal-content/legal-content.type.js";

import { LegalContentModel } from "@/modules/legal-content/legal-content.model.js";

export class LegalContentRepository {
  findByType(type: LegalContentType) {
    return LegalContentModel.findOne({ type }).exec();
  }

  upsertByType(payload: {
    type: LegalContentType;
    title: string;
    content: string;
    updatedBy: string;
  }) {
    return LegalContentModel.findOneAndUpdate(
      { type: payload.type },
      {
        $set: {
          title: payload.title,
          content: payload.content,
          updatedBy: payload.updatedBy,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    ).exec();
  }
}
