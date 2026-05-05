from fastapi import APIRouter

from routes.internal.member_routes import router as member_router
from routes.internal.theater_schedule_routes import router as theater_schedule_router

router = APIRouter(prefix="/internal", tags=["internal"])
router.include_router(member_router)
router.include_router(theater_schedule_router)
