from fastapi import APIRouter, HTTPException, Response, status
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import logging
import hashlib
import secrets
from app.schemas.user import (
    PasswordResetConfirm,
    PasswordResetRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
)
from app.utils.security import hash_password, verify_password, create_access_token
from app.config import settings
from app.database import password_reset_tokens_collection, users_collection

from app.services.email_service import (
    send_password_reset_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user: UserCreate):
    email = str(user.email).lower().strip()
    existing_user = users_collection.find_one({
        "email": email
    })

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": email,
        "phone": user.phone,
        "password_hash": hash_password(user.password),
        "role": user.role,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }

    result = users_collection.insert_one(new_user)

    return {
        "message": "User registered successfully",
        "user_id": str(result.inserted_id)
    }


@router.post("/login", response_model=TokenResponse)
def login(user: UserLogin, response: Response):
    email = str(user.email).lower().strip()
    db_user = users_collection.find_one({
        "email": email
    })

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        db_user["password_hash"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if db_user.get("status") != "active":
        raise HTTPException(
            status_code=403,
            detail="Account is not active"
        )

    token = create_access_token({
        "sub": str(db_user["_id"]),
        "role": db_user["role"]
    })

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.ENVIRONMENT.lower() == "production",
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": db_user["role"],
        "first_name": db_user["first_name"],
        "last_name": db_user["last_name"]
    }

@router.post("/forgot-password")
def forgot_password(data: PasswordResetRequest):
    generic_message = (
        "If an account exists for this email, "
        "password reset instructions have been created."
    )

    email = data.email.lower().strip()

    user = users_collection.find_one({
        "email": email
    })

    response = {
        "message": generic_message
    }

    if not user:
        return response

    password_reset_tokens_collection.delete_many({
        "user_id": str(user["_id"])
    })

    raw_token = secrets.token_urlsafe(32)

    token_hash = hashlib.sha256(
        raw_token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    password_reset_tokens_collection.insert_one({
        "user_id": str(user["_id"]),
        "token_hash": token_hash,
        "created_at": now,
        "expires_at": now + timedelta(minutes=30)
    })

    reset_url = (
        f"{settings.FRONTEND_URL}/reset-password"
        f"?token={raw_token}"
    )

    if settings.ENVIRONMENT.lower() == "production":
        try:
            send_password_reset_email(
                recipient_email=email,
                reset_url=reset_url
            )
        except Exception:
            password_reset_tokens_collection.delete_one({
                "token_hash": token_hash
            })

            logger.exception(
                "Password reset email could not be sent"
            )
    else:
        response["reset_url"] = reset_url

    return response


@router.post("/reset-password")
def reset_password(data: PasswordResetConfirm):
    new_password = data.new_password

    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 8 characters"
        )

    if not any(character.isupper() for character in new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain an uppercase letter"
        )

    if not any(character.islower() for character in new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain a lowercase letter"
        )

    if not any(character.isdigit() for character in new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain a number"
        )

    token_hash = hashlib.sha256(
        data.token.encode("utf-8")
    ).hexdigest()

    now = datetime.now(timezone.utc)

    token_record = (
        password_reset_tokens_collection.find_one_and_delete({
            "token_hash": token_hash,
            "expires_at": {
                "$gt": now
            }
        })
    )

    if not token_record:
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid or expired"
        )

    user_id = token_record["user_id"]

    if not ObjectId.is_valid(user_id):
        raise HTTPException(
            status_code=400,
            detail="This password reset link is invalid"
        )

    result = users_collection.update_one(
        {
            "_id": ObjectId(user_id)
        },
        {
            "$set": {
                "password_hash": hash_password(new_password),
                "updated_at": now
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="User account not found"
        )

    password_reset_tokens_collection.delete_many({
        "user_id": user_id
    })

    return {
        "message": "Password reset successfully"
    }


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie("access_token")
