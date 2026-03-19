import os
import sys

# Adding backend path to import models
sys.path.append(os.path.abspath('c:/Users/Admin/socioboard-google/backend'))

from database import SessionLocal
from models import AccountConnection

def main():
    db = SessionLocal()
    conns = db.query(AccountConnection).all()
    for c in conns:
        print(f"ID: {c.id}, Provider: {c.provider}, Name: {c.provider_account_name}, Acc ID: {c.provider_account_id}")

if __name__ == '__main__':
    main()
