from fastapi import HTTPException, Response

from app.routes import auth
from app.schemas.user import UserCreate, UserLogin
from app.utils.dependencies import require_role


def test_registration_login_and_httponly_cookie(monkeypatch, mongo_db):
    monkeypatch.setattr(auth, "users_collection", mongo_db.users)
    created = auth.register(UserCreate(
        first_name="Test",
        last_name="Customer",
        email="customer@example.com",
        password="Password1",
        role="customer",
    ))
    assert created["user_id"]

    response = Response()
    result = auth.login(UserLogin(email="customer@example.com", password="Password1"), response)
    assert result["role"] == "customer"
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "access_token=" in cookie


def test_role_checker_rejects_wrong_role():
    checker = require_role("admin")
    try:
        checker({"role": "customer"})
    except HTTPException as error:
        assert error.status_code == 403
    else:
        raise AssertionError("customer unexpectedly received admin access")

    assert checker({"role": "admin"})["role"] == "admin"
