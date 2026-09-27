from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal, Optional


def validate_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must contain at least 8 characters")
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must be 72 bytes or fewer")
    if not any(character.isupper() for character in password):
        raise ValueError("Password must contain an uppercase letter")
    if not any(character.islower() for character in password):
        raise ValueError("Password must contain a lowercase letter")
    if not any(character.isdigit() for character in password):
        raise ValueError("Password must contain a number")
    return password

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str
    role: Literal["customer", "business", "charity"]

    _validate_password = field_validator("password")(validate_password)

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

    _validate_password = field_validator("new_password")(validate_password)
    
class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    first_name: str
    last_name: str
