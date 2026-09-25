from app.database import platform_settings_collection


DEFAULT_COMMISSION_RATE_BPS = 1000


def get_commission_rate_bps():
    settings = platform_settings_collection.find_one({
        "key": "platform_settings"
    })

    if not settings:
        return DEFAULT_COMMISSION_RATE_BPS

    return settings.get(
        "commission_rate_bps",
        DEFAULT_COMMISSION_RATE_BPS
    )