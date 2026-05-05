from fastapi import APIRouter

from routes.internal.member_routes import router as member_router

router = APIRouter(prefix="/internal", tags=["internal"])
router.include_router(member_router)
