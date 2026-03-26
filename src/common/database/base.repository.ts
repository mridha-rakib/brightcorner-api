import type { Model, UpdateQuery } from "mongoose";

export class BaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  protected create(payload: Partial<TDocument>) {
    return this.model.create(payload);
  }

  protected findById(id: string) {
    return this.model.findById(id).exec();
  }

  protected findOne(filter: Record<string, unknown>) {
    return this.model.findOne(filter).exec();
  }

  protected updateById(id: string, update: UpdateQuery<TDocument>) {
    return this.model.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  protected deleteById(id: string) {
    return this.model.findByIdAndDelete(id).exec();
  }
}
