import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import settings


def _generate_with_ollama(
    prompt: str,
    json_output: bool = False,
) -> str:
    url = (
        f"{settings.OLLAMA_BASE_URL.rstrip('/')}"
        "/api/generate"
    )

    request_body = {
        "model": settings.OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
    }

    if json_output:
        request_body["format"] = "json"

    request = Request(
        url=url,
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=120) as response:
            response_data = json.loads(
                response.read().decode("utf-8")
            )
    except HTTPError as error:
        raise RuntimeError(
            f"Ollama returned HTTP {error.code}."
        ) from error
    except URLError as error:
        raise RuntimeError(
            "Ollama is not running. Start Ollama and try again."
        ) from error
    except TimeoutError as error:
        raise RuntimeError(
            "The local AI took too long to respond."
        ) from error

    generated_text = response_data.get("response", "").strip()

    if not generated_text:
        raise RuntimeError(
            "Ollama returned an empty response."
        )

    return generated_text


def generate_seller_insight(
    business_name: str,
    stats: list,
    days: int,
):
    prompt = f"""
You help a food-surplus business understand sales and waste patterns.

Business: {business_name}
Date range: Last {days} days

Real statistics:
{json.dumps(stats, default=str)}

Rules:
- Use only the statistics provided.
- Do not invent numbers.
- Mention the sample size when it is available.
- Identify recurring patterns.
- Give 2 to 4 cautious and practical suggestions.
- Do not give an exact production quantity target.
- Keep the response concise.
- Return plain text.

Explain the business's food-surplus patterns.
"""

    return _generate_with_ollama(prompt)


def generate_smart_basket(
    request_data: dict,
    business_options: list,
):
    prompt = f"""
You help a customer build a food-surplus basket.

Customer request:
{json.dumps(request_data, default=str)}

Available valid business options:
{json.dumps(business_options, default=str)}

Rules:
- Choose items from only one business.
- Use only business IDs and listing IDs provided.
- Never invent products, prices, quantities, businesses, or delivery fees.
- Keep the complete total at or below the customer's budget.
- If delivery is selected, include the delivery fee in the budget.
- Do not select more than each item's available_quantity.
- Prefer a useful basket for the number of people and meal purpose.
- Treat each quantity unit as one food portion.
- Select at least people multiplied by meals total portions.
- The basket may contain one meal type or a mix of meal types.
- Consider the customer's preferences when possible.
- Do not claim that stock is reserved.
- Do not claim that an order was created.
- Return valid JSON only.

Return exactly this JSON structure:
{{
  "business_id": "provided business ID",
  "business_name": "provided business name",
  "items": [
    {{
      "listing_id": "provided listing ID",
      "title": "provided listing title",
      "quantity": 1
    }}
  ],
  "reason": "Short explanation"
}}
"""

    return _generate_with_ollama(
        prompt,
        json_output=True,
    )
