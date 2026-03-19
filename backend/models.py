from sqlalchemy import Column, Integer, String, Date, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    sendgrid_api_key = Column(String(255), nullable=True)
    sendgrid_sender_email = Column(String(100), nullable=True)
    
    analytics = relationship("AnalyticsStat", back_populates="user", cascade="all, delete-orphan")
    connections = relationship("AccountConnection", back_populates="user", cascade="all, delete-orphan")

class AnalyticsStat(Base):
    __tablename__ = "analytics_stats"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    date = Column(Date, index=True)
    total_followers = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)
    active_posts = Column(Integer, default=0)
    profile_views = Column(Integer, default=0)
    
    user = relationship("User", back_populates="analytics")

class AccountConnection(Base):
    __tablename__ = "account_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    provider = Column(String(50), nullable=False) # e.g., 'facebook', 'twitter'
    provider_account_id = Column(String(255), nullable=False) # The platform's unique ID for this user/page
    provider_account_name = Column(String(255), nullable=True) # The display name (e.g. 'My Business Page')
    access_token = Column(String(2000), nullable=False) # Keys can be long
    refresh_token = Column(String(2000), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="connections")
