from fastapi import APIRouter, Depends, HTTPException

from services.member_service import MemberService

router = APIRouter(
  prefix="/members",
  tags=["members"]
)

@router.get("/")
async def get_members(service: MemberService = Depends()):
  return service.get_all()

@router.get("/{member_id}")
async def get_member(member_id: str, service: MemberService = Depends()):
  if member_id.isdigit():
    member = service.get_by_id(int(member_id))
  else:
    member = service.get_by_jkt48_id(member_id)
  if member is None:
    raise HTTPException(status_code=404, detail="Member not found")
  return member