import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export type CategoryType = 'income' | 'expense';

export type CategoryDocument = HydratedDocument<Category>;

export type CategoryModel = Model<Category>;

export type Category = {
  name: string;
  type: CategoryType;
  icon?: string;
  isDefault: boolean;
  userId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const categorySchema = new Schema<Category>(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    icon: { type: String, required: false, trim: true },
    isDefault: { type: Boolean, required: true, default: false },
    userId: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  },
  { timestamps: true },
);

export const CategoryEntity: CategoryModel =
  mongoose.models.Category ?? mongoose.model<Category>('Category', categorySchema);

