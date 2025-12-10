from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
import os
import uuid
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / filename

    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to save file")
    finally:
        file.file.close()

    return {"url": f"/uploads/{filename}"}


def delete_image_file(file_url: str):
    if not file_url:
        return

    # Check if it's a local upload
    if "/uploads/" not in file_url:
        return

    try:
        # Extract filename from URL
        filename = file_url.split("/uploads/")[-1]

        # Sanitize filename (basic check)
        if ".." in filename or "/" in filename:
            print(f"Invalid filename in delete request: {filename}")
            return

        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            os.remove(file_path)
            print(f"Deleted old image: {file_path}")
    except Exception as e:
        print(f"Error deleting file {file_url}: {e}")
