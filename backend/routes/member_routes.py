from fastapi import APIRouter, Depends

from services.member_service import MemberService

router = APIRouter(
  prefix="/members",
  tags=["members"]
)

@router.get("/")
async def get_members(service: MemberService = Depends()):
  return service.get_all()

@router.get("/{member_id}")
async def get_member(member_id: int, service: MemberService = Depends()):
  return service.get_by_id(member_id)