import { Schema, model, Document, Types } from "mongoose";
import { ServiceType } from "../types/service-type";
import { StatusType } from "../types/order-status-stype";

export interface IOrder extends Document {
  userId: Types.ObjectId;
  serviceType: ServiceType;
  serviceDate: string;
  serviceTime: string;
  status: StatusType;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true,
    },
    serviceDate: { type: String, required: true },
    serviceTime: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(StatusType),
      default: StatusType.Pending,
      required: true,
    },
    cancellationReason: { type: String },
  },
  { timestamps: true }
);

export const Order = model<IOrder>("Order", orderSchema);
