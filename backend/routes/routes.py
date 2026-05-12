from fastapi import APIRouter

from routes.contribution_routes import router as contribution_router
from routes.member_routes import router as member_router
from routes.theater_schedule_routes import router as theater_schedule_router

router = APIRouter(
  prefix="/api",
  tags=["api"]
)
router.include_router(member_router)
router.include_router(theater_schedule_router)
router.include_router(contribution_router)
