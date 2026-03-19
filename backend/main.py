from datetime import timedelta, date
from typing import List, Optional
import secrets
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uuid
import shutil
import os
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import requests
import urllib.parse

import models
from database import engine, get_db, get_mongo_db
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from auth import (
    UserCreate, UserResponse, Token, 
    get_password_hash, verify_password, 
    create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
)
from encryption import encrypt_token, decrypt_token

# Create tables in the DB if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Socioboard Backend")

async def publish_scheduled_posts():
    from database import mongo_db, SessionLocal
    while True:
        try:
            now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            
            # Find all posts due for publishing
            cursor = mongo_db.posts.find({"status": "scheduled", "scheduled_time": {"$lte": now_iso}})
            pending_posts = await cursor.to_list(length=None)
            
            if pending_posts:
                db = SessionLocal()
                published_count = 0
                
                for post in pending_posts:
                    user_id = post.get("user_id")
                    platform = post.get("platform", "").lower()
                    content = post.get("content", "")
                    
                    # Fetch OAuth Token
                    target_account_id = post.get("account_id")
                    
                    query = db.query(models.AccountConnection).filter(
                        models.AccountConnection.user_id == user_id,
                        models.AccountConnection.provider == platform
                    )
                    
                    if target_account_id:
                        query = query.filter(models.AccountConnection.provider_account_id == target_account_id)
                        
                    connection = query.first()
                    
                    success = False
                    error_message = ""
                    
                    if connection and connection.access_token:
                        decrypted_token = decrypt_token(connection.access_token)
                        # Attempt Live API Delivery
                        try:
                            if platform == "twitter":
                                url = "https://api.twitter.com/2/tweets"
                                headers = {
                                    "Authorization": f"Bearer {decrypted_token}",
                                    "Content-Type": "application/json"
                                }
                                payload = {"text": content}
                                resp = requests.post(url, headers=headers, json=payload)
                                if resp.status_code >= 400:
                                    success = False
                                    error_message = resp.text
                                    print(f"Twitter API V2 Post Failed: {resp.text}")
                                else:
                                    success = True
                            if platform == "facebook":
                                page_id = connection.provider_account_id
                                media_urls = post.get("media_urls", [])
                                
                                if media_urls and len(media_urls) > 0:
                                    media_url = media_urls[0]
                                    
                                    # Fallback mapping for local testing, as Facebook blocks localhost external pulls
                                    ngrok_url = os.getenv("NGROK_URL")
                                    if ngrok_url and "localhost:8000" in media_url:
                                        media_url = media_url.replace("http://localhost:8000", ngrok_url)
                                        
                                    lower_url = media_url.lower()
                                    is_video = lower_url.endswith('.mp4') or lower_url.endswith('.mov') or lower_url.endswith('.webm') or lower_url.endswith('.avi')
                                    
                                    if is_video:
                                        url = f"https://graph.facebook.com/v19.0/{page_id}/videos"
                                        params = {
                                            "description": content,
                                            "file_url": media_url,
                                            "access_token": decrypted_token
                                        }
                                    else:
                                        url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
                                        params = {
                                            "message": content,
                                            "url": media_url,
                                            "access_token": decrypted_token
                                        }
                                else:
                                    url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
                                    params = {
                                        "message": content,
                                        "access_token": decrypted_token
                                    }
                                
                                resp = requests.post(url, data=params) # 'data' ensures larger payloads go in body
                                if resp.status_code >= 400:
                                    success = False
                                    error_message = resp.text
                                else:
                                    success = True
                            elif platform == "linkedin":
                                author_urn = f"urn:li:person:{connection.provider_account_id}"
                                media_urls = post.get("media_urls", [])
                                
                                share_media_category = "NONE"
                                media_array = []
                                
                                if media_urls and len(media_urls) > 0:
                                    dl_url = media_urls[0]
                                    ngrok_url = os.getenv("NGROK_URL")
                                    if ngrok_url and "localhost:8000" in dl_url:
                                        dl_url = dl_url.replace("http://localhost:8000", ngrok_url)
                                        
                                    is_video = dl_url.lower().endswith('.mp4') or dl_url.lower().endswith('.mov') or dl_url.lower().endswith('.webm') or dl_url.lower().endswith('.avi')
                                    recipe = "urn:li:digitalmediaRecipe:feedshare-video" if is_video else "urn:li:digitalmediaRecipe:feedshare-image"
                                    
                                    # Phase 1: Register Upload bucket
                                    reg_url = "https://api.linkedin.com/v2/assets?action=registerUpload"
                                    reg_headers = {
                                        "Authorization": f"Bearer {decrypted_token}",
                                        "Content-Type": "application/json",
                                    }
                                    reg_body = {
                                        "registerUploadRequest": {
                                            "recipes": [recipe],
                                            "owner": author_urn,
                                            "serviceRelationships": [{"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}]
                                        }
                                    }
                                    reg_resp = requests.post(reg_url, headers=reg_headers, json=reg_body)
                                    
                                    if reg_resp.status_code < 400:
                                        reg_data = reg_resp.json()
                                        upload_mech = reg_data.get("value", {}).get("uploadMechanism", {}).get("com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest", {})
                                        upload_url = upload_mech.get("uploadUrl")
                                        asset_urn = reg_data.get("value", {}).get("asset")
                                        
                                        if upload_url and asset_urn:
                                            # Phase 2: Explicit memory download & direct binary PUT
                                            try:
                                                file_resp = requests.get(dl_url, timeout=30)
                                                if file_resp.status_code == 200:
                                                    put_headers = {"Authorization": f"Bearer {decrypted_token}"}
                                                    put_resp = requests.put(upload_url, headers=put_headers, data=file_resp.content)
                                                    
                                                    if put_resp.status_code < 400:
                                                        share_media_category = "VIDEO" if is_video else "IMAGE"
                                                        media_array = [{"status": "READY", "media": asset_urn}]
                                                    else:
                                                        print(f"LinkedIn binary PUT failed: {put_resp.text}")
                                                else:
                                                    print(f"Failed to fetch local file for LinkedIn: {dl_url} (HTTP {file_resp.status_code})")
                                            except Exception as dl_e:
                                                print(f"LinkedIn local download exception: {dl_e}")
                                        else:
                                            print(f"LinkedIn missing upload_url/asset_urn in response: {reg_resp.text}")
                                    else:
                                        print(f"LinkedIn registerUpload failed: {reg_resp.text}")

                                # Phase 3: Construct and Publish ugcPosts
                                url = "https://api.linkedin.com/v2/ugcPosts"
                                headers = {
                                    "Authorization": f"Bearer {decrypted_token}",
                                    "Content-Type": "application/json",
                                    "X-Restli-Protocol-Version": "2.0.0",
                                }
                                share_content = {
                                    "shareCommentary": {"text": content},
                                    "shareMediaCategory": share_media_category
                                }
                                if media_array:
                                    share_content["media"] = media_array
                                    
                                body = {
                                    "author": author_urn,
                                    "lifecycleState": "PUBLISHED",
                                    "specificContent": {"com.linkedin.ugc.ShareContent": share_content},
                                    "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
                                }
                                
                                resp = requests.post(url, headers=headers, json=body)
                                if resp.status_code >= 400:
                                    success = False
                                    error_message = resp.text
                                else:
                                    success = True
                            elif platform == "pinterest":
                                # Pinterest Graph API requires an explicit board to pin onto.
                                media_urls = post.get("media_urls", [])
                                media_source = None
                                
                                if media_urls and len(media_urls) > 0:
                                    media_source = {
                                        "source_type": "image_url",
                                        "url": media_urls[0]
                                    }
                                
                                # Phase 1: Query for the default physical Board ID natively
                                boards_url = "https://api.pinterest.com/v5/boards"
                                headers = {
                                    "Authorization": f"Bearer {decrypted_token}",
                                    "Content-Type": "application/json"
                                }
                                boards_resp = requests.get(boards_url, headers=headers)
                                
                                if boards_resp.status_code < 400:
                                    boards_data = boards_resp.json()
                                    items = boards_data.get("items", [])
                                    
                                    if items:
                                        board_id = items[0].get("id")
                                        
                                        # Phase 2: Post the actual Pin explicitly to the matched Board
                                        pins_url = "https://api.pinterest.com/v5/pins"
                                        pin_body = {
                                            "board_id": board_id,
                                            "title": "Socioboard Post", # Native Graph requirement
                                            "description": content
                                        }
                                        if media_source:
                                            pin_body["media_source"] = media_source
                                            
                                        resp = requests.post(pins_url, headers=headers, json=pin_body)
                                        
                                        if resp.status_code >= 400:
                                            success = False
                                            error_message = resp.text
                                        else:
                                            success = True
                                    else:
                                        success = False
                                        error_message = "No Pinterest boards found. You must explicitly create a board first!"
                                else:
                                    success = False
                                    error_message = f"Failed to fetch Pinterest boards: {boards_resp.text}"
                                    
                            elif platform == "snapchat":
                                # Native Snapchat Business Graph Integration
                                headers = {
                                    "Authorization": f"Bearer {decrypted_token}"
                                }
                                media_urls = post.get("media_urls", [])
                                if not media_urls:
                                    success = False
                                    error_message = "Snapchat requires at least one video attachment."
                                else:
                                    try:
                                        # 1. Fetch Business Organizations
                                        orgs_url = "https://businessapi.snapchat.com/v1/me/organizations"
                                        orgs_resp = requests.get(orgs_url, headers=headers)
                                        orgs_data = orgs_resp.json()
                                        orgs = orgs_data.get("organizations", [])
                                        
                                        if not orgs:
                                            success = False
                                            error_message = "OAuth token lacks a connected Business Organization. Personal accounts are restricted."
                                        else:
                                            org_id = orgs[0].get("organization", {}).get("id")
                                            
                                            # 2. Fetch Public Profiles linked to Org
                                            profiles_url = f"https://businessapi.snapchat.com/v1/organizations/{org_id}/public_profiles"
                                            profiles_resp = requests.get(profiles_url, headers=headers)
                                            profiles_data = profiles_resp.json()
                                            profiles = profiles_data.get("public_profiles", [])
                                            
                                            if not profiles:
                                                success = False
                                                error_message = "No Public Profiles found for this Business Organization."
                                            else:
                                                profile_id = profiles[0].get("public_profile", {}).get("id")
                                                
                                                # 3. Create Media and Spotlight Snap natively
                                                spotlight_url = f"https://businessapi.snapchat.com/v1/public_profiles/{profile_id}/spotlight_snaps"
                                                
                                                snap_payload = {
                                                    "spotlight_snap": {
                                                        "description": content,
                                                        "media_url": media_urls[0],
                                                        "status": "PUBLISHED"
                                                    }
                                                }
                                                headers["Content-Type"] = "application/json"
                                                post_resp = requests.post(spotlight_url, headers=headers, json=snap_payload)
                                                
                                                if post_resp.status_code >= 400:
                                                    success = False
                                                    error_message = f"Snapchat API Rejected Payload: {post_resp.text}"
                                                else:
                                                    success = True
                                    except Exception as sc_e:
                                        success = False
                                        error_message = f"Snapchat Publisher Error: {str(sc_e)}"
                                error_message = "Unsupported platform or missing token."
                        except Exception as e:
                            error_message = str(e)
                            print(f"Failed to hit live {platform} API: {e}")
                    else:
                        error_message = "No connected account found for this platform."
                    
                    if success:
                        await mongo_db.posts.update_one(
                            {"_id": post["_id"]},
                            {"$set": {"status": "published"}}
                        )
                        published_count += 1
                        print(f"[{platform}] Successfully published post ID {post['_id']}")
                    else:
                        print(f"[{platform}] Failed to publish {post['_id']}: {error_message}")
                        await mongo_db.posts.update_one(
                            {"_id": post["_id"]},
                            {"$set": {"status": "failed", "error": error_message}}
                        )
                        
                    # Email Notification Dispatch Layer
                    try:
                        user = db.query(models.User).filter(models.User.id == user_id).first()
                        if user and user.sendgrid_api_key and user.sendgrid_sender_email:
                            sg_url = "https://api.sendgrid.com/v3/mail/send"
                            sg_headers = {
                                "Authorization": f"Bearer {user.sendgrid_api_key}",
                                "Content-Type": "application/json"
                            }
                            status_text = "Published Successfully" if success else "Failed to Publish"
                            color = "#10b981" if success else "#ef4444"
                            
                            html_content = f"<h2>Update on your {platform.capitalize()} post</h2>"
                            html_content += f"<p style='color: {color}; font-weight: bold;'>{status_text}</p>"
                            html_content += f"<p><strong>Content:</strong> {content}</p>"
                            if not success:
                                html_content += f"<p><strong>Error:</strong> {error_message}</p>"
                                
                            sg_body = {
                                "personalizations": [{"to": [{"email": user.email}]}],
                                "from": {"email": user.sendgrid_sender_email},
                                "subject": f"Socioboard: Post {status_text} on {platform.capitalize()}",
                                "content": [{"type": "text/html", "value": html_content}]
                            }
                            sg_resp = requests.post(sg_url, headers=sg_headers, json=sg_body)
                            if sg_resp.status_code >= 400:
                                print(f"SendGrid Error: HTTP {sg_resp.status_code} - {sg_resp.text}")
                    except Exception as e:
                        print(f"SendGrid Dispatch Exception: {e}")
                            
                db.close()
                print(f"Processed and published {published_count} scheduled posts.")
                
        except Exception as e:
            print(f"Error in background publisher: {e}")
            
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(publish_scheduled_posts())

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "https://kurtis-supereducated-deeanna.ngrok-free.dev", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Welcome to Socioboard API!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- AI Route ---
class AIGenerateRequest(BaseModel):
    topic: str
    platform: str
    image_url: Optional[str] = None

class AIEnhanceRequest(BaseModel):
    content: str
    platform: str

class AnalyticsInsightRequest(BaseModel):
    history: list[dict]

class EmailSettingsUpdate(BaseModel):
    sendgrid_api_key: Optional[str] = None
    sendgrid_sender_email: Optional[str] = None

class GoogleToken(BaseModel):
    token: str

class MediaResponse(BaseModel):
    url: str
    filename: str
    size_mb: float
    type: str

class AnalyticsStatResponse(BaseModel):
    id: int
    user_id: int
    date: date
    total_followers: int
    engagement_rate: float
    active_posts: int
    profile_views: int
    
    class Config:
        from_attributes = True

class AnalyticsSummaryResponse(BaseModel):
    current: AnalyticsStatResponse
    history: List[AnalyticsStatResponse]

class PostCreate(BaseModel):
    content: str
    scheduled_time: str | None = None
    platform: str = "Facebook"
    media_urls: List[str] = []
    account_id: str | None = None
    status: str = "scheduled"

class PostResponse(BaseModel):
    id: str
    content: str
    scheduled_time: str
    platform: str
    status: str
    media_urls: List[str] = []
    account_id: str | None = None

class UserUpdate(BaseModel):
    username: str
    email: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Helpers ---
def seed_initial_analytics(db: Session, user_id: int):
    # Create 7 days of fake historical data
    today = date.today()
    stats = []
    base_followers = 1500
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        stat = models.AnalyticsStat(
            user_id=user_id,
            date=day,
            total_followers=base_followers + (6-i)*50,
            engagement_rate=4.2 + (6-i)*0.1,
            active_posts=24 + (6-i),
            profile_views=850 + (6-i)*120
        )
        stats.append(stat)
    db.add_all(stats)
    db.commit()

# --- Auth Routes ---

@app.post("/api/auth/google", response_model=Token)
async def google_auth(request: GoogleToken, db: Session = Depends(get_db)):
    try:
        # Dynamically map GOOGLE_CLIENT_ID to verify the authentic live audience.
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(
            request.token, 
            google_requests.Request(),
            audience=client_id
        )
        email = idinfo['email']
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google token"
        )
        
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        # Auto-generate a unique username based on the email
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1
            
        hashed_password = get_password_hash(secrets.token_urlsafe(16))
        user = models.User(
            username=username,
            email=email,
            hashed_password=hashed_password
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        seed_initial_analytics(db, user.id)
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username or email already exists
    db_user = db.query(models.User).filter(
        (models.User.email == user.email) | (models.User.username == user.username)
    ).first()
    
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    seed_initial_analytics(db, new_user.id)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        # We use username as the principal subject ("sub") for the token
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/auth/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Form_data.username can be either the user's username or email
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) | (models.User.email == form_data.username)
    ).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Social OAuth Routes ---

frontend_url = "https://kurtis-supereducated-deeanna.ngrok-free.dev"

def get_user_from_state(state: str, db: Session):
    if not state or state == "mock_state":
        return db.query(models.User).first()
    try:
        from jose import jwt
        from auth import SECRET_KEY, ALGORITHM
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username:
            user = db.query(models.User).filter(models.User.username == username).first()
            if user:
                return user
    except Exception as e:
        print("State parsing error:", e)
    return db.query(models.User).first()

@app.get("/api/auth/facebook/login")
async def facebook_login(token: str = None):
    app_id = os.getenv("FACEBOOK_APP_ID")
    redirect_uri = urllib.parse.quote("https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/facebook/callback")
    state = token if token else "mock_state"
    url = f"https://www.facebook.com/v18.0/dialog/oauth?client_id={app_id}&redirect_uri={redirect_uri}&state={state}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,public_profile,pages_read_user_content"
    return RedirectResponse(url)

@app.get("/api/auth/facebook/callback")
async def facebook_callback(code: str, request: Request, state: str = None, db: Session = Depends(get_db)):
    # Standard OAuth Exchange
    # In a real rigorous production environment, we securely map this back to the requesting user via state tokens.
    # For this demonstration proxy, we'll associate it with the first active user or a mock if no JWT is passed in the URL.
    app_id = os.getenv("FACEBOOK_APP_ID")
    app_secret = os.getenv("FACEBOOK_APP_SECRET")
    redirect_uri = "https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/facebook/callback"
    
    token_url = f"https://graph.facebook.com/v18.0/oauth/access_token?client_id={app_id}&redirect_uri={redirect_uri}&client_secret={app_secret}&code={code}"
    
    try:
        # Step 1: Exchange code for user access token
        resp = requests.get(token_url)
        data = resp.json()
        user_access_token = data.get("access_token")
        
        if not user_access_token:
            error_msg = data.get("error", {}).get("message", "Unknown OAuth error")
            print(f"Facebook Token Exchange Failed: {error_msg}")
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=facebook_auth_failed")
            
        # Step 1.5: Print exactly what permissions this token was granted
        perms_url = f"https://graph.facebook.com/v18.0/me/permissions?access_token={user_access_token}"
        perms_resp = requests.get(perms_url).json()
        print("--- GRANTED PERMISSIONS DEBUG ---")
        print(f"PERMISSIONS: {perms_resp}")
            
        # Step 2: Use user token to fetch managed Pages (since Socioboard publishes to Pages)
        pages_url = f"https://graph.facebook.com/v18.0/me/accounts?fields=name,access_token&access_token={user_access_token}"
        pages_resp = requests.get(pages_url)
        pages_data = pages_resp.json()
        
        print("--- FACEBOOK GRAPH API DEBUG ---")
        print(f"RAW PAGES DATA RESPONSE: {pages_data}")
        
        user = get_user_from_state(state, db)
        if not user:
            print("Could not decrypt securely state token to assign Facebook pages.")
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=invalid_state")
            
        if 'data' in pages_data and len(pages_data['data']) > 0:
            # User has managed Pages. Iterate and bind all of them to the user.
            for page in pages_data['data']:
                print(f"PROCESSING PAGE: {page}")
                page_id = page.get('id')
                page_name = page.get('name')
                page_access_token = page.get('access_token')
                
                # Step 3: Exchange short-lived page token for long-lived user token
                # Getting a long-lived user token first
                ll_token_url = f"https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id={app_id}&client_secret={app_secret}&fb_exchange_token={page_access_token}"
                ll_resp = requests.get(ll_token_url).json()
                ll_user_token = ll_resp.get("access_token", page_access_token)
                
                # Step 4: Now fetch the long-lived page token using the long-lived user token
                ll_page_token_url = f"https://graph.facebook.com/v18.0/{page_id}?fields=access_token&access_token={ll_user_token}"
                ll_page_resp = requests.get(ll_page_token_url).json()
                final_page_token = ll_page_resp.get("access_token", ll_user_token)

                access_token = final_page_token
                provider_account_id = page['id']
                provider_account_name = page.get('name') or 'Facebook Page'

                existing = db.query(models.AccountConnection).filter(
                    models.AccountConnection.user_id == user.id,
                    models.AccountConnection.provider == "facebook",
                    models.AccountConnection.provider_account_id == provider_account_id
                ).first()
                
                if existing:
                    existing.access_token = encrypt_token(access_token)
                    existing.provider_account_name = provider_account_name
                else:
                    conn = models.AccountConnection(
                        user_id=user.id,
                        provider="facebook",
                        provider_account_id=provider_account_id,
                        provider_account_name=provider_account_name,
                        access_token=encrypt_token(access_token)
                    )
                    db.add(conn)
            db.commit()
        else:
            print("User has no Facebook Pages to manage. Falling back to Profile Token.")
            me_url = f"https://graph.facebook.com/v18.0/me?access_token={user_access_token}"
            me_resp = requests.get(me_url).json()
            access_token = user_access_token
            provider_account_id = me_resp.get('id')
            profile_name = me_resp.get('name')
            provider_account_name = f"{profile_name} (Personal Profile)" if profile_name else 'Personal Facebook Account'

            if not provider_account_id:
                print("Failed to fetch user profile ID.")
                return RedirectResponse(f"{frontend_url}/dashboard/settings?error=no_facebook_pages")
            
            existing = db.query(models.AccountConnection).filter(
                models.AccountConnection.user_id == user.id,
                models.AccountConnection.provider == "facebook",
                models.AccountConnection.provider_account_id == provider_account_id
            ).first()
            
            if existing:
                existing.access_token = encrypt_token(access_token)
                existing.provider_account_name = provider_account_name
            else:
                conn = models.AccountConnection(
                    user_id=user.id,
                    provider="facebook",
                    provider_account_id=provider_account_id,
                    provider_account_name=provider_account_name,
                    access_token=encrypt_token(access_token)
                )
                db.add(conn)
            db.commit()

    except Exception as e:
        print(f"Facebook connection aborted: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=connection_aborted")

    return RedirectResponse(f"{frontend_url}/dashboard/settings?connected=facebook")

@app.get("/api/auth/twitter/login")
async def twitter_login(token: str = None):
    # CRITICAL FIX: OAuth 2.0 requires a distinct Client ID, completely separate from the OAuth 1.0a Consumer Key!
    client_id = os.getenv("TWITTER_CLIENT_ID")
    base_url = os.getenv("NGROK_URL", "http://localhost:8000").rstrip("/")
    redirect_uri = urllib.parse.quote(f"{base_url}/api/auth/twitter/callback")
    state = token if token else "mock_state"
    # OAuth 2.0 PKCE Flow for Twitter
    url = f"https://twitter.com/i/oauth2/authorize?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state={state}&code_challenge=challenge&code_challenge_method=plain"
    
    # Strictly bind an un-cacheable 303 See Other payload to evade Google Chrome 307 intercept blocks!
    response = RedirectResponse(url, status_code=303)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@app.get("/api/auth/twitter/callback")
async def twitter_callback(code: str, request: Request, state: str = None, db: Session = Depends(get_db)):
    client_id = os.getenv("TWITTER_CLIENT_ID")
    client_secret = os.getenv("TWITTER_CLIENT_SECRET")
    base_url = os.getenv("NGROK_URL", "http://localhost:8000").rstrip("/")
    redirect_uri = f"{base_url}/api/auth/twitter/callback"
    
    token_url = "https://api.twitter.com/2/oauth2/token"
    
    payload = {
        "code": code,
        "grant_type": "authorization_code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code_verifier": "challenge" # In production, this must match the generated PKCE verifier
    }
    
    auth_header = requests.auth.HTTPBasicAuth(client_id, client_secret)
    
    try:
        resp = requests.post(token_url, data=payload, auth=auth_header, headers={"Content-Type": "application/x-www-form-urlencoded"})
        data = resp.json()
        access_token = data.get("access_token")
        
        if not access_token:
            import logging
            logging.error(f"Twitter OAuth Error Payload: {resp.text}")
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=twitter_auth_failed")
            
        # Get user info
        me_url = "https://api.twitter.com/2/users/me"
        me_resp = requests.get(me_url, headers={"Authorization": f"Bearer {access_token}"})
        me_data = me_resp.json().get("data", {})
        provider_account_id = me_data.get("id")
        provider_account_name = me_data.get("name") or me_data.get("username") or "Twitter User"
        
        if not provider_account_id:
            import logging
            logging.error(f"Twitter Profile Error: {me_resp.text}")
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=twitter_profile_failed")
            
    except Exception as e:
        import logging
        logging.error(f"Twitter connection aborted: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=connection_aborted")

    user = get_user_from_state(state, db)
    if user:
        existing = db.query(models.AccountConnection).filter(
            models.AccountConnection.user_id == user.id,
            models.AccountConnection.provider == "twitter"
        ).first()
        
        if existing:
            existing.access_token = encrypt_token(access_token)
            existing.provider_account_id = provider_account_id
            existing.provider_account_name = provider_account_name
        else:
            conn = models.AccountConnection(
                user_id=user.id,
                provider="twitter",
                provider_account_id=provider_account_id,
                provider_account_name=provider_account_name,
                access_token=encrypt_token(access_token)
            )
            db.add(conn)
        db.commit()

    return RedirectResponse(f"{frontend_url}/dashboard/settings?connected=twitter")

@app.get("/api/auth/linkedin/login")
async def linkedin_login(token: str = None):
    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    redirect_uri = urllib.parse.quote("https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/linkedin/callback")
    state = token if token else "mock_state"
    # Ported to modern OIDC scopes required by LinkedIn V2
    url = f"https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={client_id}&redirect_uri={redirect_uri}&state={state}&scope=openid%20profile%20email%20w_member_social"
    return RedirectResponse(url)

@app.get("/api/auth/linkedin/callback")
async def linkedin_callback(code: str, request: Request, state: str = None, db: Session = Depends(get_db)):
    # Real OAuth Exchange for validation
    client_id = os.getenv("LINKEDIN_CLIENT_ID")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
    redirect_uri = "https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/linkedin/callback"
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "client_id": client_id,
        "client_secret": client_secret
    }
    try:
        resp = requests.post(token_url, data=payload)
        access_token = resp.json().get("access_token")
        if not access_token:
            print("LinkedIn OAuth Error:", resp.text)
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=linkedin_auth_failed")
            
        # Get member ID
        me_url = "https://api.linkedin.com/v2/userinfo"
        me_resp = requests.get(me_url, headers={"Authorization": f"Bearer {access_token}"})
        me_data = me_resp.json()
        provider_account_id = me_data.get("sub")
        
        first_name = me_data.get("given_name", "")
        last_name = me_data.get("family_name", "")
        provider_account_name = f"{first_name} {last_name}".strip() or "LinkedIn Profile"

        if not provider_account_id:
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=linkedin_profile_failed")
            
    except Exception as e:
        print(f"LinkedIn connection aborted: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=connection_aborted")
    
    user = get_user_from_state(state, db)
    if user:
        existing = db.query(models.AccountConnection).filter(
            models.AccountConnection.user_id == user.id,
            models.AccountConnection.provider == "linkedin"
        ).first()
        
        if existing:
            existing.access_token = encrypt_token(access_token)
            existing.provider_account_id = provider_account_id
            existing.provider_account_name = provider_account_name
        else:
            conn = models.AccountConnection(
                user_id=user.id,
                provider="linkedin",
                provider_account_id=provider_account_id,
                provider_account_name=provider_account_name,
                access_token=encrypt_token(access_token)
            )
            db.add(conn)
        db.commit()

    return RedirectResponse(f"{frontend_url}/dashboard/settings?connected=linkedin")

@app.get("/api/auth/pinterest/login")
async def pinterest_login(token: str = None):
    client_id = os.getenv("PINTEREST_APP_ID")
    redirect_uri = urllib.parse.quote("https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/pinterest/callback")
    state = token if token else "mock_state"
    url = f"https://www.pinterest.com/oauth/?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=boards:read,pins:read,pins:write&state={state}"
    return RedirectResponse(url)

@app.get("/api/auth/pinterest/callback")
async def pinterest_callback(code: str, request: Request, state: str = None, db: Session = Depends(get_db)):
    import base64
    client_id = os.getenv("PINTEREST_APP_ID")
    client_secret = os.getenv("PINTEREST_APP_SECRET")
    redirect_uri = "https://kurtis-supereducated-deeanna.ngrok-free.dev/api/auth/pinterest/callback"
    token_url = "https://api.pinterest.com/v5/oauth/token"
    
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri
    }
    
    try:
        resp = requests.post(token_url, headers=headers, data=payload)
        data = resp.json()
        access_token = data.get("access_token")
        
        if not access_token:
            print("Pinterest OAuth Error:", resp.text)
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=pinterest_auth_failed")
            
        # Get user info
        me_url = "https://api.pinterest.com/v5/user_account"
        me_resp = requests.get(me_url, headers={"Authorization": f"Bearer {access_token}"})
        me_data = me_resp.json()
        
        provider_account_id = me_data.get("username")
        provider_account_name = me_data.get("username") or "Pinterest User"
        
        if not provider_account_id:
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=pinterest_profile_failed")
            
    except Exception as e:
        print(f"Pinterest connection aborted: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=connection_aborted")

    user = get_user_from_state(state, db)
    if user:
        existing = db.query(models.AccountConnection).filter(
            models.AccountConnection.user_id == user.id,
            models.AccountConnection.provider == "pinterest"
        ).first()
        
        if existing:
            existing.access_token = encrypt_token(access_token)
            existing.provider_account_id = provider_account_id
            existing.provider_account_name = provider_account_name
        else:
            conn = models.AccountConnection(
                user_id=user.id,
                provider="pinterest",
                provider_account_id=provider_account_id,
                provider_account_name=provider_account_name,
                access_token=encrypt_token(access_token)
            )
            db.add(conn)
        db.commit()

    return RedirectResponse(f"{frontend_url}/dashboard/settings?connected=pinterest")

@app.get("/api/auth/snapchat/login")
async def snapchat_login(token: str = None):
    client_id = os.getenv("SNAPCHAT_CONFIDENTIAL_CLIENT_ID")
    base_url = os.getenv("NGROK_URL", "http://localhost:8000").rstrip("/")
    
    # Decode token to get the short username to prevent exceeding Snapchat's hidden `state` length limits.
    auth_state = "unknown_user"
    if token:
        try:
            import jwt
            from auth import SECRET_KEY, ALGORITHM
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            auth_state = payload.get("sub", "unknown_user")
        except:
            pass
            
    import hashlib, base64
    code_verifier = base64.urlsafe_b64encode(hashlib.sha256(auth_state.encode('utf-8')).digest()).decode('utf-8').rstrip('=')
    code_challenge = base64.urlsafe_b64encode(hashlib.sha256(code_verifier.encode('utf-8')).digest()).decode('utf-8').rstrip('=')

    params = {
        "client_id": client_id,
        "redirect_uri": f"{base_url}/api/auth/snapchat/callback",
        "response_type": "code",
        "scope": "https://auth.snapchat.com/oauth2/api/user.display_name snapchat-marketing-api",
        "state": auth_state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    url = f"https://accounts.snapchat.com/login/oauth2/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url)

@app.get("/api/auth/snapchat/callback")
async def snapchat_callback(code: str, request: Request, state: str = None, db: Session = Depends(get_db)):
    client_id = os.getenv("SNAPCHAT_CONFIDENTIAL_CLIENT_ID")
    client_secret = os.getenv("SNAPCHAT_CLIENT_SECRET")
    base_url = os.getenv("NGROK_URL", "http://localhost:8000").rstrip("/")
    redirect_uri = f"{base_url}/api/auth/snapchat/callback"
    
    token_url = "https://accounts.snapchat.com/login/oauth2/access_token"
    import hashlib, base64
    safe_state = state if state else "unknown_user"
    code_verifier = base64.urlsafe_b64encode(hashlib.sha256(safe_state.encode('utf-8')).digest()).decode('utf-8').rstrip('=')

    payload = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
        "code_verifier": code_verifier
    }
    
    try:
        resp = requests.post(token_url, data=payload)
        data = resp.json()
        access_token = data.get("access_token")
        
        if not access_token:
            print("Snapchat OAuth Error:", resp.text)
            return RedirectResponse(f"{frontend_url}/dashboard/settings?error=snapchat_auth_failed")
            
        me_url = "https://kit.snapchat.com/v1/me"
        query = {"query": "{me{externalId,displayName}}"}
        me_resp = requests.post(me_url, headers={"Authorization": f"Bearer {access_token}"}, json=query)
        me_data = me_resp.json()
        
        user_data = me_data.get("data", {}).get("me", {})
        provider_account_id = user_data.get("externalId")
        provider_account_name = user_data.get("displayName") or "Snapchat User"
        
        if not provider_account_id:
            provider_account_id = f"snap_{state[:8]}" if state else "snap_user"
            provider_account_name = "Snapchat Account"
            
    except Exception as e:
        print(f"Snapchat connection aborted: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=connection_aborted")

    try:
        user_id = None
        if state and state != "unknown_user":
            # 'state' now directly contains the username
            user = db.query(models.User).filter(models.User.username == state).first()
            if user:
                user_id = user.id
            else:
                print(f"Warning: User not found for username from state: {state}")
        else:
            print("Warning: State did not contain a valid username for account matching.")
                
        if not user_id:
            user = db.query(models.User).first()
            if not user:
                return RedirectResponse(f"{frontend_url}/dashboard/settings?error=no_user_found")
            user_id = user.id

        encrypted_token = encrypt_token(access_token)
        existing_conn = db.query(models.AccountConnection).filter(
            models.AccountConnection.user_id == user_id,
            models.AccountConnection.provider == 'snapchat'
        ).first()

        if existing_conn:
            existing_conn.access_token = encrypted_token
            existing_conn.provider_account_name = provider_account_name
            existing_conn.provider_account_id = provider_account_id
        else:
            new_conn = models.AccountConnection(
                user_id=user_id,
                provider='snapchat',
                provider_account_id=provider_account_id,
                provider_account_name=provider_account_name,
                access_token=encrypted_token
            )
            db.add(new_conn)
        db.commit()

        return RedirectResponse(f"{frontend_url}/dashboard/settings?connected=snapchat")
    except Exception as e:
        print(f"Snapchat DB Binding Error: {e}")
        return RedirectResponse(f"{frontend_url}/dashboard/settings?error=snapchat_db_binding_failed")

# --- Protected Routes Example ---
@app.get("/api/users/me/connections")
async def read_user_connections(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    connections = db.query(models.AccountConnection).filter(models.AccountConnection.user_id == current_user.id).all()
    return [{"provider": c.provider, "provider_account_id": c.provider_account_id, "name": c.provider_account_name} for c in connections]

@app.delete("/api/users/me/connections/{provider}")
async def disconnect_user_connection(provider: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    connection = db.query(models.AccountConnection).filter(
        models.AccountConnection.user_id == current_user.id,
        models.AccountConnection.provider == provider
    ).first()
    
    if not connection:
        raise HTTPException(status_code=404, detail=f"No active connection found for {provider}")
        
    db.delete(connection)
    db.commit()
    return {"status": "success", "message": f"Successfully disconnected {provider}"}

@app.get("/api/users/me", response_model=UserResponse)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/api/users/me", response_model=UserResponse)
async def update_user_me(
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Check for email collision
    if user_update.email != current_user.email:
        if db.query(models.User).filter(models.User.email == user_update.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")
            
    # Check for username collision
    if user_update.username != current_user.username:
        if db.query(models.User).filter(models.User.username == user_update.username).first():
            raise HTTPException(status_code=400, detail="Username already taken")
            
    current_user.email = user_update.email
    current_user.username = user_update.username
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/api/users/me/password")
async def change_password(
    passwords: PasswordChange,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not verify_password(passwords.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
        
    current_user.hashed_password = get_password_hash(passwords.new_password)
    db.commit()
    return {"status": "password updated successfully"}

@app.put("/users/me/password")
def change_password(passwords: dict, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(passwords.get("current_password"), current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    current_user.hashed_password = get_password_hash(passwords.get("new_password"))
    db.commit()
    return {"message": "Password updated successfully"}

@app.get("/users/me/email-settings")
def get_email_settings(current_user: models.User = Depends(get_current_user)):
    return {
        "sendgrid_api_key": current_user.sendgrid_api_key,
        "sendgrid_sender_email": current_user.sendgrid_sender_email
    }

@app.put("/users/me/email-settings")
def update_email_settings(settings: EmailSettingsUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    current_user.sendgrid_api_key = settings.sendgrid_api_key
    current_user.sendgrid_sender_email = settings.sendgrid_sender_email
    db.commit()
    db.refresh(current_user)
    return {"message": "Email settings updated successfully."}

@app.get("/users/me/connections")
async def read_user_connections(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    connections = db.query(models.AccountConnection).filter(models.AccountConnection.user_id == current_user.id).all()
    return [{"provider": c.provider, "provider_account_id": c.provider_account_id, "name": c.provider_account_name} for c in connections]

# --- Analytics Routes ---
@app.get("/api/analytics/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    
    # 1. Total Connected Networks securely queried from MySQL
    connections_count = db.query(models.AccountConnection).filter(
        models.AccountConnection.user_id == current_user.id
    ).count()
    
    # 2. Build explicit 7-Day lookback array aggregating actual output
    today = datetime.now(timezone.utc).date()
    history = []
    
    # Native MongoDB fetch to isolate all lifetime posts
    cursor = mongo_db.posts.find({"user_id": current_user.id})
    all_posts = await cursor.to_list(length=None)
    
    # Absolute count of all Media attached natively
    total_media = sum(len(p.get("media_urls", [])) for p in all_posts)
    
    for i in range(6, -1, -1):
        target_date = today - timedelta(days=i)
        
        published_up_to = 0
        scheduled_up_to = 0
        
        for p in all_posts:
            # Fallback to scheduled_time if created_at is strictly missing
            created_str = p.get("created_at") or p.get("scheduled_time", "")
            if created_str:
                try:
                    post_date = datetime.fromisoformat(created_str.replace("Z", "+00:00")).date()
                    if post_date <= target_date:
                        if p.get("status") == "published":
                            published_up_to += 1
                        elif p.get("status") == "scheduled":
                            scheduled_up_to += 1
                except:
                    pass
        
        stat = {
            "id": i,
            "user_id": current_user.id,
            "date": target_date,
            "total_followers": connections_count,      # Mapped natively to Connected Networks
            "engagement_rate": float(published_up_to), # Mapped natively to Published Posts
            "active_posts": scheduled_up_to,           # Mapped natively to Pending Queue
            "profile_views": total_media,              # Mapped natively to Media Items
        }
        history.append(stat)
        
    return {
        "current": history[-1],
        "history": history
    }

# --- Upload Route ---
@app.post("/api/upload")
async def upload_media(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    ext = file.filename.split(".")[-1] if "." in file.filename else ""
    unique_filename = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    
    file.file.seek(0, 2)
    size_mb = file.file.tell() / (1024 * 1024)
    file.file.seek(0)
    
    file_type = "video" if ext.lower() in ["mp4", "mov", "webm", "avi"] else "image"

    if aws_access_key:
        import boto3
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )
        bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "socioboard-media")
        
        s3_client.upload_fileobj(
            file.file,
            bucket_name,
            unique_filename,
            ExtraArgs={"ContentType": file.content_type, "ACL": "public-read"}
        )
        file_url = f"https://{bucket_name}.s3.{os.getenv('AWS_REGION', 'us-east-1')}.amazonaws.com/{unique_filename}"
    else:
        file_path = os.path.join("uploads", unique_filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        base_url = os.getenv("NGROK_URL", "http://localhost:8000").rstrip("/")
        file_url = f"{base_url}/uploads/{unique_filename}"
    # Phase 1: Upload Registration Pipeline - Strict MongoDB Map
    media_doc = {
        "user_id": current_user.id,
        "filename": unique_filename,
        "url": file_url,
        "size_mb": round(size_mb, 2),
        "type": file_type,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await mongo_db.media.insert_one(media_doc)
    
    return {"url": file_url}

@app.get("/api/media", response_model=List[MediaResponse])
async def list_media(
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    # Phase 2: Secure Vault Retrieval - Eradicate Global S3 Scans
    cursor = mongo_db.media.find({"user_id": current_user.id}).sort("created_at", -1)
    media_docs = await cursor.to_list(length=100)
    
    media_list = []
    for doc in media_docs:
        media_list.append({
            "url": doc["url"],
            "filename": doc["filename"],
            "size_mb": doc.get("size_mb", 0.0),
            "type": doc.get("type", "image")
        })
    return media_list

@app.delete("/api/media/{filename}")
async def delete_media(
    filename: str, 
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    # Phase 3: Validated Deletion - Verify Access Before Physical Drop
    existing = await mongo_db.media.find_one({"filename": filename, "user_id": current_user.id})
    if not existing:
        raise HTTPException(status_code=404, detail="Media not found or unauthorized")
        
    aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
    if aws_access_key:
        import boto3
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=aws_access_key,
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            region_name=os.getenv("AWS_REGION", "us-east-1")
        )
        bucket_name = os.getenv("AWS_S3_BUCKET_NAME", "socioboard-media")
        try:
            s3_client.delete_object(Bucket=bucket_name, Key=filename)
        except Exception:
            raise HTTPException(status_code=500, detail="Failed to delete from S3")
    else:
        file_path = os.path.join("uploads", filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    # Securely unbind from database tracking natively
    await mongo_db.media.delete_one({"_id": existing["_id"]})
    return {"status": "success"}

# --- Post Routes (MongoDB) ---
@app.post("/api/posts/bulk")
async def create_posts_bulk(
    file: UploadFile = File(...),
    limits: str = Form(None),
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    import csv
    import io
    import json
    
    content = await file.read()
    try:
        decoded_str = content.decode('utf-8-sig')
    except Exception:
        raise HTTPException(status_code=400, detail="File must be encoded as UTF-8 CSV.")
        
    csv_reader = csv.DictReader(io.StringIO(decoded_str))
    
    docs_to_insert = []
    
    for row in csv_reader:
        platform = str(row.get('platform', '')).strip()
        text = str(row.get('content', '')).strip()
        scheduled_time = str(row.get('scheduled_time', '')).strip()
        media_str = str(row.get('media_urls', '')).strip()
        
        if not platform or not text or not scheduled_time:
            continue
            
        media_urls = [m.strip() for m in media_str.split('|') if m.strip()] if media_str else []
        
        post_dict = {
            "content": text,
            "scheduled_time": scheduled_time,
            "platform": platform,
            "media_urls": media_urls,
            "user_id": current_user.id,
            "status": "scheduled",
            "account_id": None
        }
        docs_to_insert.append(post_dict)
        
    if not docs_to_insert:
        raise HTTPException(status_code=400, detail="No valid posts found in CSV. Required headers: platform, content, scheduled_time.")
        
    if len(docs_to_insert) > 200:
        raise HTTPException(status_code=400, detail="Maximum 200 posts allowed per CSV bulk upload.")
        
    await mongo_db.posts.insert_many(docs_to_insert)
    
    return {"status": "success", "scheduled_count": len(docs_to_insert)}

@app.post("/api/posts", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    post_dict = post.model_dump()
    post_dict["user_id"] = current_user.id
    post_dict["status"] = post.status
    
    if post.status == "scheduled" and not post.scheduled_time:
        raise HTTPException(status_code=400, detail="Scheduled time is required for scheduling posts.")
    
    result = await mongo_db.posts.insert_one(post_dict)
    
    return PostResponse(
        id=str(result.inserted_id),
        content=post.content,
        scheduled_time=post.scheduled_time or "",
        platform=post.platform,
        status=post.status,
        media_urls=post.media_urls,
        account_id=post.account_id
    )

@app.get("/api/posts", response_model=list[PostResponse])
async def get_posts(
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    posts_cursor = mongo_db.posts.find({"user_id": current_user.id}).sort("scheduled_time", 1)
    posts = await posts_cursor.to_list(length=100)
    
    # Format ObjectId to string for Pydantic
    for post in posts:
        post["id"] = str(post.pop("_id"))
        
    return posts

@app.put("/api/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    post: PostCreate,
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    from bson.errors import InvalidId
    try:
        obj_id = ObjectId(post_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid post ID format")

    # Verify ownership before updating
    existing_post = await mongo_db.posts.find_one({"_id": obj_id, "user_id": current_user.id})
    if not existing_post:
        raise HTTPException(status_code=404, detail="Post not found or unauthorized")

    update_data = post.model_dump()
    
    # Execute update
    await mongo_db.posts.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )

    # Fetch and return the updated document
    updated_doc = await mongo_db.posts.find_one({"_id": obj_id})
    updated_doc["id"] = str(updated_doc.pop("_id"))
    
    return updated_doc

@app.delete("/api/posts/{post_id}")
async def delete_post(
    post_id: str,
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    result = await mongo_db.posts.delete_one({"_id": ObjectId(post_id), "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"status": "success"}

@app.get("/api/activity", response_model=list[PostResponse])
async def get_activity(
    current_user: models.User = Depends(get_current_user),
    mongo_db: AsyncIOMotorDatabase = Depends(get_mongo_db)
):
    # Retrieve the 10 most recently published posts
    cursor = mongo_db.posts.find(
        {"user_id": current_user.id, "status": "published"}
    ).sort("scheduled_time", -1).limit(10)
    
    posts = await cursor.to_list(length=10)
    
    for post in posts:
        post["id"] = str(post.pop("_id"))
        
    return posts
