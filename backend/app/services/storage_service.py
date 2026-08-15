import uuid
from pathlib import Path

import aiofiles
from fastapi import UploadFile

from app.config import get_settings

settings = get_settings()


async def save_upload(file: UploadFile, user_id: int) -> tuple[str, str, str]:
    upload_dir = Path(settings.upload_dir) / str(user_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else "pdf"
    file_type = "pdf" if ext == "pdf" else "docx" if ext in ("doc", "docx") else ext
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = upload_dir / unique_name

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return str(file_path), file.filename or unique_name, file_type
