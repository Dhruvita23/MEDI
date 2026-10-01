"""
main.py — MEDIBOT Hospital Logistics API Entry Point
Registers all routers and initialises the FastAPI application.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config.database import connect_db, close_db
from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.order_routes import router as order_router


# ---------------------------------------------------------------------------
# Lifespan: open / close the MongoDB connection with the app lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="MEDIBOT Hospital Logistics API",
    description="5-floor, 50-bed hospital automation backend with RBAC",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the frontend (file:// or any localhost port) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend at http://127.0.0.1:8000/
app.mount("/ui", StaticFiles(directory="frontend", html=True), name="frontend")

# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------
app.include_router(auth_router,  prefix="/api/auth",   tags=["Authentication"])
app.include_router(admin_router, prefix="/api/admin",  tags=["Admin Staff"])
app.include_router(order_router, prefix="/api/orders", tags=["Orders"])


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "MEDIBOT API is running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
