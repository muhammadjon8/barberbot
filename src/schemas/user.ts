import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  telegramId: number;
  fullName: string;
  telegramUsername?: string;
  phoneNumber: string;
  numberOfBookings: number;
  isRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true },
    fullName: { type: String, required: true },
    telegramUsername: { type: String },
    phoneNumber: { type: String, required: true },
    numberOfBookings: { type: Number, default: 0 },
    isRegistered: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
