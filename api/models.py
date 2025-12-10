from pydantic import BaseModel, Field, EmailStr, BeforeValidator
from typing import List, Optional, Annotated
from datetime import datetime

# Helper to convert ObjectId to string
PyObjectId = Annotated[str, BeforeValidator(str)]


class UserBase(BaseModel):
    name: str
    email: EmailStr
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    avatar: Optional[str] = None
    password: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserInDB(UserBase):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    password_hash: str
    avatar: Optional[str] = None
    is_active: bool = True


class GroupBase(BaseModel):
    name: str
    icon: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GroupCreate(GroupBase):
    pass


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserSummary(BaseModel):
    id: str
    name: str
    email: str
    avatar: Optional[str] = None


class GroupInDB(GroupBase):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    members: List[str] = []
    expenses: List[str] = []
    invite_code: str
    icon: Optional[str] = None


class GroupWithMembers(GroupInDB):
    members_details: List[UserSummary] = []


class ExpenseBase(BaseModel):
    description: str
    amount: float
    category: str = "General"
    tags: List[str] = []
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExpenseCreate(ExpenseBase):
    payer_id: str
    group_id: str
    split_details: dict  # {user_id: amount}


class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    payer_id: Optional[str] = None
    split_details: Optional[dict] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ExpenseInDB(ExpenseBase):
    id: Optional[PyObjectId] = Field(None, alias="_id")
    payer_id: str
    group_id: str
    split_details: dict
