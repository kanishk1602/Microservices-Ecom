import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  orderId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Order", OrderSchema);
