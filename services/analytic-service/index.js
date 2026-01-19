import express from "express";
import cors from "cors";
import { Kafka } from "kafkajs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Payment from "./models/Payment.js";
import Order from "./models/Order.js";
import Email from "./models/Email.js";

dotenv.config();

const app = express();
// MongoDB health check endpoint (must be after app is defined)
app.get("/db-health", (req, res) => {
  const state = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: states[state] || "unknown",
    state,
    mongoUri: mongoose.connection.host || undefined,
    timestamp: new Date().toISOString(),
  });
});
const PORT = process.env.PORT || 4005;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true,
  })
);
app.use(express.json());

// Kafka setup
const kafka = new Kafka({
  clientId: "analytic-service",
  brokers: ["localhost:9094"],
});

const consumer = kafka.consumer({ groupId: "analytic-service" });

// MongoDB connection
const mongoUri =
  process.env.DATABASE_URL ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/analytics";
mongoose
  .connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Analytics Service",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get service info
app.get("/", (req, res) => {
  res.json({
    service: "Analytics Service",
    version: "1.0.0",
    port: PORT,
    endpoints: {
      health: "/health",
      analytics: "/api/analytics (GET)",
      stats: "/api/stats (GET)",
    },
  });
});

// Get analytics data

// Get analytics data from DB
app.get("/api/analytics", async (req, res) => {
  try {
    const payments = await Payment.find().sort({ timestamp: -1 }).limit(100);
    const orders = await Order.find().sort({ timestamp: -1 }).limit(100);
    const emails = await Email.find().sort({ timestamp: -1 }).limit(100);
    res.json({
      success: true,
      data: { payments, orders, emails },
      message: "Analytics data retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get analytics data",
    });
  }
});

// Get statistics

// Get statistics from DB
app.get("/api/stats", async (req, res) => {
  try {
    const [payments, orders, emails] = await Promise.all([
      Payment.find(),
      Order.find(),
      Email.find(),
    ]);
    const totalRevenue = payments.reduce((acc, p) => acc + p.total, 0);
    const totalOrders = orders.length;
    const totalEmails = emails.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const recentPayments = payments.slice(-5);
    const recentOrders = orders.slice(-5);
    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders,
        totalEmails,
        averageOrderValue,
        recentPayments,
        recentOrders,
      },
      message: "Statistics retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get statistics",
    });
  }
});

const run = async () => {
  try {
    // Connect to Kafka
    await consumer.connect();

    // Subscribe to analytics topics
    await consumer.subscribe({
      topics: ["payment-successful", "order-successful", "email-successful"],
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        switch (topic) {
          case "payment-successful":
            {
              const value = message.value.toString();
              let parsed;
              try {
                parsed = JSON.parse(value);
              } catch (e) {
                console.warn(
                  `Analytic consumer: Could not parse payment-successful message: ${value}`
                );
                break;
              }

              // If cart exists, use old logic
              if (Array.isArray(parsed.cart)) {
                const total = parsed.cart
                  .reduce((acc, item) => acc + item.price, 0)
                  .toFixed(2);
                await Payment.create({
                  userId: parsed.userId,
                  total: parseFloat(total),
                  timestamp: new Date(),
                });
                console.log(
                  `Analytic consumer: User ${parsed.userId} paid ${total}`
                );
              } else {
                // New event structure: log all available fields
                await Payment.create({
                  userId: parsed.userId,
                  orderId: parsed.orderId,
                  paymentId: parsed.paymentId,
                  status: parsed.status,
                  email: parsed.email,
                  timestamp: parsed.timestamp
                    ? new Date(parsed.timestamp)
                    : new Date(),
                });
                console.log(
                  `Analytic consumer: Payment event logged with fields: ${Object.keys(
                    parsed
                  ).join(", ")}`
                );
              }
            }
            break;
          case "order-successful":
            {
              const value = message.value.toString();
              const { userId, orderId } = JSON.parse(value);

              // Save order to DB
              await Order.create({
                userId,
                orderId,
                timestamp: new Date(),
              });

              console.log(
                `Analytic consumer: Order id ${orderId} created for user id ${userId}`
              );
            }
            break;
          case "email-successful":
            {
              const value = message.value.toString();
              const { userId, emailId } = JSON.parse(value);

              // Save email to DB
              await Email.create({
                userId,
                emailId,
                timestamp: new Date(),
              });

              console.log(
                `Analytic consumer: Email id ${emailId} sent to user id ${userId}`
              );
            }
            break;

          default:
            break;
        }
      },
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Analytics Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API docs: http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error("Error starting analytics service:", err);
    process.exit(1);
  }
};

run();
