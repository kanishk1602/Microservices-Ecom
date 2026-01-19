import os
import asyncio
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from aiokafka import AIOKafkaConsumer
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import json
import gspread
from google.oauth2.service_account import Credentials
from contextlib import asynccontextmanager

load_dotenv()

# Environment variables
MONGO_URI = os.getenv("DATABASE_URL") or "mongodb://localhost:27017"
KAFKA_BROKER = os.getenv("KAFKA_BROKERS") or "localhost:9094"
GROUP_ID = os.getenv("KAFKA_GROUP_ID") or "analytic-service-python"
PORT = int(os.getenv("PORT", 4004))

# FastAPI setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    global consumer_task
    try:
        # Test Google Sheets connection but don't block startup
        logger.info("🚀 Starting Analytics Service...")
        
        logger.info(f"Using Kafka group id: {GROUP_ID}")
        consumer_task = asyncio.create_task(consume_kafka())
        yield
    finally:
        if consumer_task:
            consumer_task.cancel()
            try:
                await consumer_task
            except asyncio.CancelledError:
                pass

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("analytics-service")


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
        # Test Google Sheets connection instead of MongoDB
        sheet = get_google_sheet()
        return {"status": "connected", "service": "Google Sheets", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        return {"status": "disconnected", "error": str(e)}
    
@app.get("/test-google-sheet")
async def test_google_sheet():
    try:
        # Test basic Google API connection without creating files
        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        client = gspread.authorize(creds)
        return {"success": True, "message": "Google Sheets API connection successful", "service_account": "ecom-982@spikeai-481608.iam.gserviceaccount.com"}
    except Exception as e:
        return {"success": False, "error": str(e)}

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
    try:
        records = get_all_records_from_sheet()
        payments = filter_records_by_type(records, "payment")
        orders = filter_records_by_type(records, "order")
        emails = filter_records_by_type(records, "email")
        
        # Sort by timestamp (most recent first)
        payments = sorted(payments, key=lambda x: x.get("timestamp", ""), reverse=True)[:100]
        orders = sorted(orders, key=lambda x: x.get("timestamp", ""), reverse=True)[:100]
        emails = sorted(emails, key=lambda x: x.get("timestamp", ""), reverse=True)[:100]
        
        return {
            "success": True,
            "data": {"payments": payments, "orders": orders, "emails": emails},
            "message": "Analytics data retrieved successfully from Google Sheets"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to retrieve analytics data"
        }

@app.get("/api/stats")
async def get_stats():
    try:
        records = get_all_records_from_sheet()
        payments = filter_records_by_type(records, "payment")
        orders = filter_records_by_type(records, "order")
        emails = filter_records_by_type(records, "email")
        
        # Calculate statistics
        totalRevenue = sum(float(p.get("total", 0) or 0) for p in payments)
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
                "recentPayments": payments[-5:] if payments else [],
                "recentOrders": orders[-5:] if orders else []
            },
            "message": "Statistics retrieved successfully from Google Sheets"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to retrieve statistics"
        }

# Google Sheets Setup
SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_CREDENTIALS_JSON")
GOOGLE_SHEET_ID = os.getenv("GOOGLE_SHEET_ID")

def get_google_sheet():
    try:
        creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
        client = gspread.authorize(creds)
        
        # Use the sheet ID from environment variable if provided
        if GOOGLE_SHEET_ID and GOOGLE_SHEET_ID != "your_sheet_id_here":
            logger.info(f"Using Google Sheet ID: {GOOGLE_SHEET_ID}")
            sheet = client.open_by_key(GOOGLE_SHEET_ID).sheet1
        else:
            # Fallback: try to create a new sheet (this might fail due to quota)
            logger.warning("No sheet ID provided, attempting to create new one")
            spreadsheet = client.create("Analytics Transactions")
            sheet = spreadsheet.sheet1
            # Add headers
            sheet.append_row(["UserId", "Data1", "Data2", "Data3", "Data4", "Timestamp", "Type"])
            logger.info(f"Created new sheet: {spreadsheet.url}")
        return sheet
    except Exception as e:
        logger.error(f"Google Sheets setup error: {e}")
        raise e

def get_all_records_from_sheet():
    """Get all records from the Google Sheet"""
    try:
        sheet = get_google_sheet()
        records = sheet.get_all_records()
        return records
    except Exception as e:
        logger.error(f"Error reading from Google Sheets: {e}")
        return []

def filter_records_by_type(records, record_type):
    """Filter records by type (payment, order, email)"""
    filtered = []
    for record in records:
        # Check if the record has the expected fields for each type
        if record_type == "payment" and ("total" in record or "paymentId" in record):
            filtered.append(record)
        elif record_type == "order" and "orderId" in record and "total" not in record:
            filtered.append(record)
        elif record_type == "email" and "emailId" in record:
            filtered.append(record)
    return filtered

# Kafka consumer error handling - don't fail if Google Sheets has issues
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
                logger.info(f"📨 Received {topic} message: {payload}")
                
                # Try to write to Google Sheets, but don't fail if it's not available
                try:
                    sheet = get_google_sheet()
                    if topic == "payment-successful":
                        if isinstance(payload.get("cart"), list):
                            total = sum(item.get("price", 0) for item in payload["cart"])
                            doc = {
                                "userId": payload.get("userId"),
                                "total": total,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            logger.info(f"💾 Processing payment: {doc}")
                            sheet.append_row([doc["userId"], doc["total"], doc["timestamp"], "payment"])
                        else:
                            doc = {
                                "userId": payload.get("userId"),
                                "orderId": payload.get("orderId"),
                                "paymentId": payload.get("paymentId"),
                                "status": payload.get("status"),
                                "email": payload.get("email"),
                                "timestamp": datetime.fromisoformat(payload["timestamp"]).isoformat() if payload.get("timestamp") else datetime.utcnow().isoformat()
                            }
                            logger.info(f"💾 Processing payment: {doc}")
                            sheet.append_row([doc["userId"], doc["orderId"], doc["paymentId"], doc["status"], doc["email"], doc["timestamp"], "payment"])
                    elif topic == "order-successful":
                        doc = {
                            "userId": payload.get("userId"),
                            "orderId": payload.get("orderId"),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        logger.info(f"💾 Processing order: {doc}")
                        sheet.append_row([doc["userId"], doc["orderId"], doc["timestamp"], "order"])
                    elif topic == "email-successful":
                        doc = {
                            "userId": payload.get("userId"),
                            "emailId": payload.get("emailId"),
                            "timestamp": datetime.utcnow().isoformat()
                        }
                        logger.info(f"💾 Processing email: {doc}")
                        sheet.append_row([doc["userId"], doc["emailId"], doc["timestamp"], "email"])
                except Exception as sheets_error:
                    logger.error(f"⚠️ Google Sheets error: {sheets_error}")
                    logger.info("📝 Message logged but not saved to sheets")
                    
            except Exception as e:
                logger.error(f"❌ Failed to process message: {e}")
    except Exception as e:
        logger.error(f"❌ Kafka consumer error: {e}")
    finally:
        await consumer.stop()
        logger.info("🔒 Kafka consumer stopped")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)

