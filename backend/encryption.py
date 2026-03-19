import os
from cryptography.fernet import Fernet

def get_fernet():
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise ValueError("ENCRYPTION_KEY environment variable is not set")
    return Fernet(key.encode('utf-8'))

def encrypt_token(token: str) -> str:
    if not token:
        return token
    f = get_fernet()
    return f.encrypt(token.encode('utf-8')).decode('utf-8')

def decrypt_token(encrypted_token: str) -> str:
    if not encrypted_token:
        return encrypted_token
    f = get_fernet()
    try:
        return f.decrypt(encrypted_token.encode('utf-8')).decode('utf-8')
    except Exception:
        # Fallback for plain tokens during transition
        return encrypted_token
