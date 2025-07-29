import express from "express";
import cors from "cors";
import { Kafka } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

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
  clientId: "email-service",
  brokers: ["localhost:9094"],
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "email-service" });

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Email Service",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Get service info
app.get("/", (req, res) => {
  res.json({
    service: "Email Service",
    version: "1.0.0",
    port: PORT,
    endpoints: {
      health: "/health",
      sendEmail: "/api/send-email (POST)",
    },
  });
});

// Send email endpoint
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    // Validate input
    if (!to || !subject) {
      return res.status(400).json({ error: "To and subject are required" });
    }

    // For now, just log the email (mock implementation)
    console.log(`Email would be sent to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || "No text content"}`);

    res.json({
      success: true,
      message: "Email sent successfully (mock)",
      to,
      subject,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
    });
  }
});

const run = async () => {
  try {
    // Connect to Kafka
    await producer.connect();
    await consumer.connect();

    // Subscribe to email-related topics
    await consumer.subscribe({
      topic: "order-successful",
      fromBeginning: true,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value.toString();
        const payload = JSON.parse(value);
        const email = payload.email;

        if (email) {
          console.log(`Email consumer: Email sent to ${email}`);
        } else {
          console.warn("Email consumer: No email found in event payload");
        }

        // TODO: Send email to the user
        const dummyEmailId = "091584203985";

        await producer.send({
          topic: "email-successful",
          messages: [
            {
              value: JSON.stringify({
                userId: payload.userId || "anonymous",
                emailId: dummyEmailId,
              }),
            },
          ],
        });
      },
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Email Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API docs: http://localhost:${PORT}/`);
    });
  } catch (err) {
    console.error("Error starting email service:", err);
    process.exit(1);
  }
};

run();
