import os
import requests
from encryption import decrypt_token
from database import SessionLocal
import models

db = SessionLocal()
conn = db.query(models.AccountConnection).filter(models.AccountConnection.provider == 'facebook').first()

if not conn:
    print("NO FACEBOOK CONNECTION FOUND IN DB")
    exit()

dec_token = decrypt_token(conn.access_token)
print(f"Token Length: {len(dec_token)}")

print("\n--- FETCHING PAGES V18.0 ---")
pages_url = f"https://graph.facebook.com/v18.0/me/accounts?access_token={dec_token}"
print(requests.get(pages_url).text)

print("\n--- FETCHING PAGES WITH TASKS ---")
pages_url = f"https://graph.facebook.com/v18.0/me/accounts?fields=name,tasks,access_token&access_token={dec_token}"
print(requests.get(pages_url).text)

print("\n--- FETCHING PERMISSIONS ---")
perms_url = f"https://graph.facebook.com/v18.0/me/permissions?access_token={dec_token}"
print(requests.get(perms_url).text)

print("\n--- FETCHING PAGES V19.0 ---")
pages_url = f"https://graph.facebook.com/v19.0/me/accounts?access_token={dec_token}"
print(requests.get(pages_url).text)
