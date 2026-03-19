import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import motor.motor_asyncio

# The docker-compose default is mysql+pymysql://user:password@mysql:3306/socioboard
# By default we fall back to a local sqlite if the env var isn't present
SQLALCHEMY_DATABASE_URL = os.getenv(
    "MYSQL_URL", 
    "mysql+pymysql://user:password@localhost:3306/socioboard"
)

# Connect args needed for SQLite, ignored by MySQL
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency for FastAPI (MySQL)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- MongoDB Configuration ---
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
mongo_db = mongo_client.get_database("socioboard")

# Dependency for FastAPI (MongoDB)
async def get_mongo_db():
    yield mongo_db
