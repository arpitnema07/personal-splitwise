from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from models import UserCreate, UserLogin, UserInDB
import database
from utils import get_password_hash, verify_password, create_access_token
from datetime import timedelta
from jose import JWTError, jwt
from utils import SECRET_KEY, ALGORITHM

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


@router.post("/register", response_model=UserInDB)
async def register(user: UserCreate):
    existing_user = await database.db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user.password)
    user_in_db = UserInDB(**user.dict(), password_hash=hashed_password)
    new_user = await database.db.users.insert_one(
        user_in_db.dict(by_alias=True, exclude={"id"})
    )
    created_user = await database.db.users.find_one({"_id": new_user.inserted_id})
    return UserInDB(**created_user)


@router.post("/login")
async def login(user: UserLogin):  # Simplified for this demo
    db_user = await database.db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": db_user["email"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await database.db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return UserInDB(**user)
