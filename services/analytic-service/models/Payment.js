import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
  userId: { type: String },
  total: { type: Number },
  orderId: { type: String },
  paymentId: { type: String },
  status: { type: String },
  email: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", PaymentSchema);
