import express from "express";
import cors from "cors";
import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

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
  clientId: "order-service",
  brokers: ["localhost:9094"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "order-service" });

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Order Service",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get service info
app.get("/", (req, res) => {
  res.json({
    service: "Order Service",
    version: "1.0.0",
    port: PORT,
    endpoints: {
      health: "/health",
      createOrder: "/api/orders (POST)",
      getOrders: "/api/orders (GET)",
    },
  });
});

// Create order endpoint
app.post("/api/orders", async (req, res) => {
  try {
    const { items, userId, email } = req.body;

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Items array is required" });
    }

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Calculate total
    const total = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create order object
    const order = {
      orderId: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items,
      total,
      userId: userId || "anonymous",
      email,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Publish order created event to Kafka
    await producer.send({
      topic: "order-created",
      messages: [
        {
          value: JSON.stringify(order),
        },
      ],
    });

    console.log(`Order created: ${order.orderId} for ${email}`);

    res.status(201).json({
      success: true,
      order,
      message: "Order created successfully",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create order",
    });
  }
});

// Get orders endpoint
app.get("/api/orders", async (req, res) => {
  try {
    res.json({
      success: true,
      orders: [
        {
          orderId: "mock_order_1",
          status: "completed",
          total: 299.99,
          createdAt: new Date().toISOString(),
        },
      ],
      message: "Orders retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get orders",
    });
  }
});

const run = async () => {
  try {
    // Connect to Kafka
    await producer.connect();
    await consumer.connect();

    // --- Nodemailer setup ---
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    async function sendMail(to, subject, text) {
      try {
        console.log(`Attempting to send email to: ${to}`);
        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to,
          subject,
          text,
        });
        console.log(`Email sent to ${to}`);
      } catch (e) {
        console.error("Failed to send email:", e);
      }
    }

    // --- Kafka consumers ---
    await consumer.subscribe({
      topic: "payment-successful",
      fromBeginning: true,
    });
    await consumer.subscribe({
      topic: "payment-failed",
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        let cart, email;
        try {
          const payload = JSON.parse(value);
          cart = payload.cart;
          email = payload.email || "test@example.com"; // fallback
        } catch (e) {
          console.error("Invalid message", e);
          return;
        }

        if (topic === "payment-successful") {
          // TODO: Create order on DB
          const dummyOrderId = "123456789";
          // Send success email
          await sendMail(
            email,
            "Order Placed Successfully",
            `Your order (ID: ${dummyOrderId}) has been placed and payment was successful!`
          );
        } else if (topic === "payment-failed") {
          // Send failed email
          await sendMail(
            email,
            "Payment Failed",
            "Your payment attempt was unsuccessful. Please try again."
          );
        }
      },
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Order Service running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error("Error starting order service:", err);
    process.exit(1);
  }
};

run();
