from fastapi import APIRouter, Depends

from services.member_service import MemberService

router = APIRouter(
  prefix="/members",
  tags=["members"]
)

@router.get("/")
async def get_members(service: MemberService = Depends()):
  return service.get_all()