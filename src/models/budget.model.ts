import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export type BudgetDocument = HydratedDocument<Budget>;

export type BudgetModel = Model<Budget>;

export type Budget = {
  userId: Types.ObjectId;
  categoryId?: Types.ObjectId;
  limit: number;
  createdAt: Date;
  updatedAt: Date;
};

const budgetSchema = new Schema<Budget>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    categoryId: { type: Schema.Types.ObjectId, required: false, ref: 'Category' },
    limit: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);

budgetSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

export const BudgetEntity: BudgetModel = mongoose.models.Budget ?? mongoose.model<Budget>('Budget', budgetSchema);
