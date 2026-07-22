import { Model, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

// יוצר סט מתודות CRUD בסיסיות מעל מודל Mongoose נתון.
// כל DAL קונקרטי פורש (spread) את זה ומוסיף מתודות ספציפיות משלו.
export function createBaseDal<T extends Document>(model: Model<T>) {
  return {
    async findById(id: string, options?: QueryOptions): Promise<T | null> {
      return model.findById(id, null, options);
    },

    async findOne(filter: FilterQuery<T>, options?: QueryOptions): Promise<T | null> {
      return model.findOne(filter, null, options);
    },

    async find(filter: FilterQuery<T>, options?: QueryOptions): Promise<T[]> {
      return model.find(filter, null, options);
    },

    async create(data: Partial<T>): Promise<T> {
      return model.create(data) as Promise<T>;
    },

    async updateById(id: string, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
      return model.findByIdAndUpdate(id, update, { new: true, ...options });
    },

    async updateOne(filter: FilterQuery<T>, update: UpdateQuery<T>, options?: QueryOptions): Promise<T | null> {
      return model.findOneAndUpdate(filter, update, { new: true, ...options });
    },

    async deleteById(id: string, options?: QueryOptions): Promise<T | null> {
      return model.findByIdAndDelete(id, options);
    },

    async deleteMany(filter: FilterQuery<T>): Promise<number> {
      const result = await model.deleteMany(filter);
      return result.deletedCount;
    },

    async count(filter: FilterQuery<T>): Promise<number> {
      return model.countDocuments(filter);
    },

    async exists(filter: FilterQuery<T>): Promise<boolean> {
      const doc = await model.exists(filter);
      return doc !== null;
    },
  };
}
