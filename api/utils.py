import bcrypt
from jose import jwt
from datetime import datetime, timedelta
import os

# SECURITY WARNING: Don't run with debug turned on in production!
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # Fallback only for local dev convenience, warn in logs
    print("WARNING: SECRET_KEY not set in environment. Using unsafe default.")
    SECRET_KEY = "unsafe_dev_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def get_password_hash(password):
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
