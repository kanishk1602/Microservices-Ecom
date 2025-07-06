import mongoose from "mongoose";

const EmailSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  emailId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Email", EmailSchema);
