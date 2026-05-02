import os
from typing import Union

from imagekitio import ImageKit

from config import IMAGEKIT_PRIVATE_KEY

imagekit = ImageKit(private_key=IMAGEKIT_PRIVATE_KEY)


def _safe_upload_name(name: Union[str, bytes, None]) -> str:
    """
    httpx multipart requires ASCII-safe str filenames; UploadFile.filename may be
    bytes or None, which triggers TypeError in the ImageKit/httpx stack.
    """
    if name is None:
        return "upload.png"
    if isinstance(name, bytes):
        name = name.decode("utf-8", errors="replace")
    base = os.path.basename(str(name).strip()) or "upload.png"
    return base


def upload_file(
    file_bytes: bytes,
    file_name: Union[str, bytes, None],
    folder: str,
    content_type: str = "image/png",
) -> str:
    """Upload a file to ImageKit"""
    safe_name = _safe_upload_name(file_name)
    ct = str(content_type) if content_type else "application/octet-stream"
    # imagekitio expects tuple (filename, content[, content_type]); see _files._transform_file.
    result = imagekit.files.upload(
        file=(safe_name, file_bytes, ct),
        file_name=safe_name,
        folder=folder,
        is_private_file=False,
        use_unique_file_name=True,
    )
    return result.url


def get_variants(base_url: str) -> dict:
    """Get the variants of a file from ImageKit"""
    # youtube , shorts, square 3 variations return
    return {
        "youtube": f"{base_url}?tr=w-1920,h-1080,c-maintain_ratio,fo_auto",
        "shorts": f"{base_url}?tr=w-1080,h-1920,c-maintain_ratio,fo_auto",
        "square": f"{base_url}?tr=w-1080,h-1080,c-maintain_ratio,fo_auto",
        "3x": f"{base_url}?tr=w-1080,h-1080,c-maintain_ratio,fo_auto",
    }
