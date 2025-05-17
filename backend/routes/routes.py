from fastapi import APIRouter

from routes.member_routes import router as member_router

router = APIRouter(
  prefix="/api",
  tags=["api"]
)
router.include_router(member_router)
