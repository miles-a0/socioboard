import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.socioboard
    post = await db.posts.find_one(sort=[('_id', -1)])
    print(post.get("error"))

if __name__ == "__main__":
    asyncio.run(main())
