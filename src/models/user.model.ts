import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export type UserModel = Model<User>;

export type User = {
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
  },
  { timestamps: true },
);

export const UserEntity: UserModel = mongoose.models.User ?? mongoose.model<User>('User', userSchema);

