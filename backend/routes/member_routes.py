from fastapi import APIRouter, Depends, HTTPException, Query

from services.member_service import MemberService

router = APIRouter(
  prefix="/members",
  tags=["members"]
)

@router.get("/")
async def get_members(team: str | None = Query(None), service: MemberService = Depends()):
  return service.get_all(team=team)

@router.get("/upcoming-birthdays")
async def upcoming_birthdays(days: int = Query(30, ge=1, le=90), service: MemberService = Depends()):
  return service.get_upcoming_birthdays(days)

@router.get("/{member_id}/theater-stats")
async def member_theater_stats(member_id: str, service: MemberService = Depends()):
  return service.get_theater_stats(member_id)


@router.get("/{member_id}/shows")
async def member_recent_shows(
  member_id: str,
  limit: int = Query(10, ge=1, le=50),
  service: MemberService = Depends(),
):
  return service.get_recent_shows(member_id, limit=limit)


@router.get("/{member_id}")
async def get_member(member_id: str, service: MemberService = Depends()):
  if member_id.isdigit():
    member = service.get_by_id(int(member_id))
  else:
    member = service.get_by_jkt48_id(member_id)
  if member is None:
    raise HTTPException(status_code=404, detail="Member not found")
  return member