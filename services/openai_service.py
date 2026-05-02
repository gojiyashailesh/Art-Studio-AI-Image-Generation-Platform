"""OpenAI image generation for thumbnail PNG bytes."""

import httpx
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI, AuthenticationError

from config import OPENAI_API_KEY, OPENAI_BASE_URL

_client_kwargs: dict = {
    "api_key": OPENAI_API_KEY,
    "timeout": 120.0,
    "max_retries": 2,
}
if OPENAI_BASE_URL:
    _client_kwargs["base_url"] = OPENAI_BASE_URL

client = AsyncOpenAI(**_client_kwargs)


def _format_openai_network_error(exc: Exception) -> str:
    """Turn vague 'Connection error.' into something actionable."""
    cause = exc.__cause__
    tail = f" Cause: {cause!r}" if cause else ""
    return (
        "Cannot reach OpenAI API (check internet, VPN, firewall, or corporate proxy). "
        "Verify OPENAI_API_KEY in .env and try again."
        f"{tail}"
    )


async def generate_thumbnails(
    prompt: str,
    style_prompt: str,
    headshot_url: str,
) -> bytes:
    """
    Build a single thumbnail image as PNG bytes from the user prompt, style, and headshot reference URL.
    """
    if not (OPENAI_API_KEY or "").strip():
        raise ValueError(
            "OPENAI_API_KEY is missing or empty. Set it in the project root `.env` file."
        )

    full_prompt = (
        f"{style_prompt}\n\nUser request: {prompt}\n\n"
        f"Subject reference (match likeness where appropriate): {headshot_url}"
    )

    try:
        result = await client.images.generate(
            model="dall-e-3",
            prompt=full_prompt[:4000],
            size="1024x1024",
            quality="standard",
            n=1,
        )
    except AuthenticationError as exc:
        raise ValueError(
            "OpenAI rejected the API key (invalid, revoked, or wrong project)."
        ) from exc
    except APITimeoutError as exc:
        raise TimeoutError(
            "OpenAI image request timed out. Try again or increase timeout."
        ) from exc
    except APIConnectionError as exc:
        raise RuntimeError(_format_openai_network_error(exc)) from exc

    image_url = result.data[0].url
    if not image_url:
        raise RuntimeError("OpenAI image response missing URL")

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(60.0, connect=15.0),
            follow_redirects=True,
        ) as http_client:
            response = await http_client.get(image_url)
            response.raise_for_status()
            return response.content
    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Downloaded image URL from OpenAI failed (network): {exc!r}"
        ) from exc
