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

print("\n--- FETCHING ME ---")
me_url = f"https://graph.facebook.com/v18.0/me?access_token={dec_token}"
print(requests.get(me_url).text)

print("\n--- FETCHING PAGES ---")
pages_url = f"https://graph.facebook.com/v18.0/me/accounts?fields=name,access_token&access_token={dec_token}"
print(requests.get(pages_url).text)

print("\n--- FETCHING PERMISSIONS ---")
perms_url = f"https://graph.facebook.com/v18.0/me/permissions?access_token={dec_token}"
print(requests.get(perms_url).text)
