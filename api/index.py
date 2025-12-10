from dotenv import load_dotenv
from pathlib import Path
import sys
import os

# Fix for Vercel: Add current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load env before other imports
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection
from auth import router as auth_router
from groups import router as groups_router
from expenses import router as expenses_router
from users import router as users_router
from upload import router as upload_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(groups_router, prefix="/api/groups", tags=["groups"])
app.include_router(expenses_router, prefix="/api/expenses", tags=["expenses"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(upload_router, prefix="/api/upload", tags=["upload"])


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Point to the client/dist directory
# Ensure we go up from api/ directory to root, then into client/dist
DIST_DIR = Path(__file__).resolve().parent.parent / "client" / "dist"

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # Mount uploads directory to serve uploaded images
    UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
    if UPLOADS_DIR.exists():
        app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API routes to pass through if they weren't matched above?
        # Actually FastAPI matches in order. Since this is at bottom, it catches everything else.
        # But we valid API routes are already matched.
        # What about 404s for API? They will fall here and return index.html.
        # That's acceptable for now, or we can check if full_path starts with "api".
        if full_path.startswith("api"):
            from fastapi import HTTPException

            raise HTTPException(status_code=404, detail="Not Found")

        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        return FileResponse(DIST_DIR / "index.html")
else:
    print(f"Dist directory {DIST_DIR} not found. Build frontend first.")
