import asyncio

from app.services.stock_hold_service import (
    expire_old_holds
)

from app.services.donation_service import (
    convert_expired_listings_to_donations
)


async def background_worker():
    while True:
        try:
            expire_old_holds()

            convert_expired_listings_to_donations()

        except Exception as error:
            print(
                "Background worker error:",
                error
            )

        await asyncio.sleep(60)