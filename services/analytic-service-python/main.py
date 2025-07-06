import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from aiokafka import AIOKafkaConsumer
import certifi
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json

load_dotenv()

# Environment variables
MONGO_URI = os.getenv("DATABASE_URL") or "mongodb://localhost:27017"
KAFKA_BROKER = os.getenv("KAFKA_BROKERS") or "localhost:9094"
GROUP_ID = os.getenv("KAFKA_GROUP_ID") or "analytic-service-python"
PORT = int(os.getenv("PORT", 4005))

# FastAPI setup
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics-service")

# MongoDB
mongo_client = AsyncIOMotorClient(MONGO_URI, tls=True, tlsCAFile=certifi.where())
db = mongo_client.analytics

# Kafka
consumer = None
consumer_task = None

# Pydantic Models
class PaymentModel(BaseModel):
    userId: Optional[str]
    total: Optional[float]
    orderId: Optional[str]
    paymentId: Optional[str]
    status: Optional[str]
    email: Optional[str]
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class OrderModel(BaseModel):
    userId: str
    orderId: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

class EmailModel(BaseModel):
    userId: str
    emailId: str
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow)

# Health Check
@app.get("/health")
async def health():
    return {
        "status": "OK",
        "service": "Analytics Service",
        "port": PORT,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/db-health")
async def db_health():
    try:
        await mongo_client.admin.command("ping")
        return {"status": "connected", "mongoUri": MONGO_URI, "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}

@app.get("/")
async def root():
    return {
        "service": "Analytics Service",
        "version": "1.0.0",
        "port": PORT,
        "endpoints": {
            "health": "/health",
            "analytics": "/api/analytics (GET)",
            "stats": "/api/stats (GET)"
        }
    }

@app.get("/api/analytics")
async def get_analytics():
    payments = await db.payment.find().sort("timestamp", -1).to_list(100)
    orders = await db.order.find().sort("timestamp", -1).to_list(100)
    emails = await db.email.find().sort("timestamp", -1).to_list(100)
    return {
        "success": True,
        "data": {"payments": payments, "orders": orders, "emails": emails},
        "message": "Analytics data retrieved successfully"
    }

@app.get("/api/stats")
async def get_stats():
    payments = await db.payment.find().to_list(None)
    orders = await db.order.find().to_list(None)
    emails = await db.email.find().to_list(None)
    totalRevenue = sum(p.get("total", 0) or 0 for p in payments)
    totalOrders = len(orders)
    totalEmails = len(emails)
    avgOrderValue = totalRevenue / totalOrders if totalOrders else 0
    return {
        "success": True,
        "stats": {
            "totalRevenue": totalRevenue,
            "totalOrders": totalOrders,
            "totalEmails": totalEmails,
            "averageOrderValue": avgOrderValue,
            "recentPayments": payments[-5:],
            "recentOrders": orders[-5:]
        },
        "message": "Statistics retrieved successfully"
    }

# Kafka Consumer
async def consume_kafka():
    global consumer
    consumer = AIOKafkaConsumer(
        "payment-successful", "order-successful", "email-successful",
        bootstrap_servers=KAFKA_BROKER,
        group_id=GROUP_ID,
        auto_offset_reset="earliest"
    )
    try:
        await consumer.start()
        logger.info(f"✅ Kafka consumer started in group '{GROUP_ID}'")
        async for msg in consumer:
            try:
                payload = json.loads(msg.value.decode())
                topic = msg.topic
                if topic == "payment-successful":
                    if isinstance(payload.get("cart"), list):
                        total = sum(item.get("price", 0) for item in payload["cart"])
                        doc = {
                            "userId": payload.get("userId"),
                            "total": total,
                            "timestamp": datetime.utcnow()
                        }
                        result = await db.payment.insert_one(doc)
                        logger.info(f"💾 Saved payment document {result.inserted_id}: {doc}")
                    else:
                        doc = {
                            "userId": payload.get("userId"),
                            "orderId": payload.get("orderId"),
                            "paymentId": payload.get("paymentId"),
                            "status": payload.get("status"),
                            "email": payload.get("email"),
                            "timestamp": datetime.fromisoformat(payload["timestamp"]) if payload.get("timestamp") else datetime.utcnow()
                        }
                        result = await db.payment.insert_one(doc)
                        logger.info(f"💾 Saved payment document {result.inserted_id}: {doc}")
                elif topic == "order-successful":
                    doc = {
                        "userId": payload.get("userId"),
                        "orderId": payload.get("orderId"),
                        "timestamp": datetime.utcnow()
                    }
                    res = await db.order.insert_one(doc)
                    logger.info(f"💾 Saved order document {res.inserted_id}: {doc}")
                elif topic == "email-successful":
                    doc = {
                        "userId": payload.get("userId"),
                        "emailId": payload.get("emailId"),
                        "timestamp": datetime.utcnow()
                    }
                    res = await db.email.insert_one(doc)
                    logger.info(f"💾 Saved email document {res.inserted_id}: {doc}")
            except Exception as e:
                logger.error(f"❌ Failed to process message: {e}")
    except Exception as e:
        logger.error(f"❌ Kafka consumer error: {e}")
    finally:
        await consumer.stop()
        logger.info("🔒 Kafka consumer stopped")

@app.on_event("startup")
async def startup_event():
    global consumer_task
    try:
        await mongo_client.admin.command("ping")
        logger.info("✅ MongoDB connected")
        logger.info(f"Using Kafka group id: {GROUP_ID}")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
    consumer_task = asyncio.create_task(consume_kafka())

@app.on_event("shutdown")
async def shutdown_event():
    global consumer_task
    if consumer_task:
        consumer_task.cancel()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass

