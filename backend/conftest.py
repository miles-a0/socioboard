import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from database import Base, get_db, get_mongo_db
from models import User
from main import app
from auth import get_password_hash

# Setup SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="session")
def mongo_client():
    return AsyncMongoMockClient()

@pytest.fixture(scope="function")
def client(db_session, mongo_client):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    async def override_get_mongo():
        yield mongo_client.get_database("test_db")

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_mongo_db] = override_get_mongo
    
    with TestClient(app) as c:
        yield c
    
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
def test_user(db_session):
    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("testpassword")
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user
