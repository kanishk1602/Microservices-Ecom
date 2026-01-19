import express from "express";
import cors from "cors";
import { Kafka } from "kafkajs";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// CORS: allow configurable frontend origins (comma-separated)
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Initialize Kafka
const kafka = new Kafka({
  clientId: "payment-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9094"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "payment-group" });

// Utility to create Kafka topics if they do not exist
async function ensureKafkaTopics(admin, topics) {
  const existing = await admin.listTopics();
  const toCreate = topics.filter((topic) => !existing.includes(topic));
  if (toCreate.length > 0) {
    await admin.createTopics({
      topics: toCreate.map((name) => ({
        topic: name,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });
    console.log("Created topics:", toCreate);
  }
}

// Connect to Kafka
const connectToKafka = async () => {
  const admin = kafka.admin();
  try {
    await admin.connect();
    await ensureKafkaTopics(admin, [
      "order-created",
      "payment-processed",
      "payment-successful",
    ]);
    await admin.disconnect();

    await producer.connect();
    await consumer.connect();

    // Subscribe to payment-related topics
    await consumer.subscribe({ topic: "order-created", fromBeginning: true });
    await consumer.subscribe({
      topic: "payment-processed",
      fromBeginning: true,
    });

    console.log("Connected to Kafka and subscribed to topics");

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = JSON.parse(message.value.toString());
        console.log(`Received message from ${topic}:`, value);

        if (topic === "order-created") {
          // Handle new order creation
          await handleNewOrder(value);
        }
      },
    });
  } catch (err) {
    console.error("Error connecting to Kafka:", err);
    process.exit(1);
  }
};

// Handle new order from order service
const handleNewOrder = async (order) => {
  try {
    console.log("Processing new order:", order.orderId);
    // Here we would typically create a payment record in your database
    // and then initiate the payment process

    // For now, we'll just log it
    console.log(`Order ${order.orderId} received for payment processing`);
  } catch (error) {
    console.error("Error processing order:", error);
  }
};

// Create a new order
app.post("/api/orders", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, notes } = req.body;

    const options = {
      amount: amount * 100, // Convert to paise
      currency,
      receipt,
      payment_capture: 1, // Auto capture payment
      notes,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
});

// Verify payment
app.post("/api/verify-payment", async (req, res) => {
  try {
    const { orderId, paymentId, signature, email, userId, cart } = req.body;
    
    console.log('Verify payment request:', { orderId, paymentId, email, userId, cartItems: cart?.length || 0 });

    // Create the expected signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === signature) {
      // Payment is valid
      // Save payment details to database
      // Update order status

      console.log('Payment verified, publishing to Kafka:', { userId, email, cartItems: cart?.length });

      // Publish payment success event
      await producer.send({
        topic: "payment-successful",
        messages: [
          {
            value: JSON.stringify({
              razorpayOrderId: orderId,
              paymentId,
              signature,
              status: "completed",
              timestamp: new Date().toISOString(),
              email: email || '',
              userId: userId || 'anonymous',
              cart: Array.isArray(cart) ? cart : [],
            }),
          },
        ],
      });

      res.json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      // Invalid signature
      res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
  connectToKafka();
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  await producer.disconnect();
  await consumer.disconnect();
  process.exit(0);
});

app.post("/payment-service", async (req, res) => {
  const { cart } = req.body;
  // ASSUME THAT WE GET THE COOKIE AND DECRYPT THE USER ID
  const userId = "123";

  // TODO:PAYMENT

  // KAFKA
  await producer.send({
    topic: "payment-successful",
    messages: [{ value: JSON.stringify({ userId, cart }) }],
  });

  setTimeout(() => {
    return res.status(200).send("Payment successful");
  }, 3000);
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).send(err.message);
});
