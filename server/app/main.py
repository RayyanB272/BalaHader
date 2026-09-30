from fastapi import FastAPI
import asyncio
from fastapi.middleware.cors import CORSMiddleware

from app.routes.auth import router as auth_router
from app.routes.users import router as users_router
from app.routes.businesses import router as businesses_router
from app.routes.listings import router as listings_router
from app.routes.orders import router as orders_router
from app.routes.donations import router as donations_router
from app.routes.charities import router as charities_router
from app.routes.admin import router as admin_router
from app.routes.uploads import router as uploads_router
from app.routes.payments import router as payments_router
from app.services.background_tasks import background_worker
from app.routes.notifications import router as notifications_router
from app.routes.ai import router as ai_router
from app.routes.public import router as public_router
from app.routes.reviews import router as reviews_router
from app.config import settings

app = FastAPI(
    title="BalaHader API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        settings.FRONTEND_URL.rstrip("/"),
        *(
            ["http://localhost:5173", "http://127.0.0.1:5173"]
            if settings.ENVIRONMENT.lower() != "production"
            else []
        ),
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(businesses_router)
app.include_router(listings_router)
app.include_router(orders_router)
app.include_router(donations_router)
app.include_router(charities_router)
app.include_router(admin_router)
app.include_router(uploads_router)
app.include_router(payments_router)
app.include_router(notifications_router)
app.include_router(ai_router)
app.include_router(public_router)
app.include_router(reviews_router)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "BalaHader API is running"
    }

@app.on_event("startup")
async def start_background_workers():
    asyncio.create_task(
        background_worker()
    )
