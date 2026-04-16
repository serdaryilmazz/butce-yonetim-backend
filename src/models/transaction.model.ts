import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export type TransactionDocument = HydratedDocument<Transaction>;

export type TransactionModel = Model<Transaction>;

export type Transaction = {
  userId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  categoryId?: Types.ObjectId;
  sourceRecurringId?: Types.ObjectId;
  recurringPeriodKey?: string;
  date: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

const transactionSchema = new Schema<Transaction>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    amount: { type: Number, required: true, min: 0 },
    categoryId: { type: Schema.Types.ObjectId, required: false, ref: 'Category' },
    sourceRecurringId: { type: Schema.Types.ObjectId, required: false, ref: 'RecurringTransaction' },
    recurringPeriodKey: { type: String, required: false, trim: true },
    date: { type: Date, required: true },
    note: { type: String, required: false, trim: true },
  },
  { timestamps: true },
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index(
  { sourceRecurringId: 1, recurringPeriodKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      sourceRecurringId: { $exists: true },
      recurringPeriodKey: { $exists: true },
    },
  },
);

export const TransactionEntity: TransactionModel =
  mongoose.models.Transaction ?? mongoose.model<Transaction>('Transaction', transactionSchema);
