from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGODB_URL = os.getenv("MONGODB_URL")

client = None
db = None


async def connect_to_mongo():
    global client, db
    if MONGODB_URL:
        client = AsyncIOMotorClient(MONGODB_URL)
        db = client.get_database("splitwise_clone")
        print("Connected to MongoDB")
    else:
        print("MONGODB_URL not found")


async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("Closed MongoDB connection")
