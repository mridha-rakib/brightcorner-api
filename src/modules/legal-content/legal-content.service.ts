import type { UpdateLegalContentInput } from "@/modules/legal-content/legal-content.interface.js";
import type { LegalContentType } from "@/modules/legal-content/legal-content.type.js";

import { LegalContentRepository } from "@/modules/legal-content/legal-content.repository.js";
import { LEGAL_CONTENT_DEFAULTS } from "@/modules/legal-content/legal-content.utils.js";

export class LegalContentService {
  constructor(
    private readonly legalContentRepository: LegalContentRepository = new LegalContentRepository(),
  ) {}

  async getByType(type: LegalContentType) {
    const storedContent = await this.legalContentRepository.findByType(type);
    if (storedContent)
      return storedContent;

    const defaults = LEGAL_CONTENT_DEFAULTS[type];
    return {
      type,
      title: defaults.title,
      content: defaults.content,
      updatedBy: undefined,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  }

  async upsert(input: UpdateLegalContentInput) {
    const title = input.title?.trim() || LEGAL_CONTENT_DEFAULTS[input.type].title;
    return this.legalContentRepository.upsertByType({
      type: input.type,
      title,
      content: input.content.trim(),
      updatedBy: input.updatedBy,
    });
  }
}
