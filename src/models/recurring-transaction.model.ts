import mongoose, { HydratedDocument, Model, Schema, Types } from 'mongoose';

export type RecurringInterval = 'monthly';

export type RecurringTransactionDocument = HydratedDocument<RecurringTransaction>;

export type RecurringTransactionModel = Model<RecurringTransaction>;

export type RecurringTransaction = {
  userId: Types.ObjectId;
  amount: number;
  categoryId?: Types.ObjectId;
  interval: RecurringInterval;
  lastExecutedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const recurringTransactionSchema = new Schema<RecurringTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    amount: { type: Number, required: true, min: 0 },
    categoryId: { type: Schema.Types.ObjectId, required: false, ref: 'Category' },
    interval: { type: String, required: true, enum: ['monthly'], default: 'monthly' },
    lastExecutedDate: { type: Date, required: false },
  },
  { timestamps: true },
);

export const RecurringTransactionEntity: RecurringTransactionModel =
  mongoose.models.RecurringTransaction ??
  mongoose.model<RecurringTransaction>('RecurringTransaction', recurringTransactionSchema);

