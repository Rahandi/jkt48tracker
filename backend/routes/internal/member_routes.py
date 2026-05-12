from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.internal.auth import require_api_key
from services.member_service import MemberService


class MemberSyncItem(BaseModel):
    jkt48_id: str
    name: str
    nickname: str | None = None
    image_url: str | None = None
    dob: str | None = None
    height: int | None = None
    blood_type: str | None = None
    horoscope: str | None = None
    twitter: str | None = None
    instagram: str | None = None
    team: str | None = None


class MemberShowCountItem(BaseModel):
    jkt48_id: str
    total_show_count: int


router = APIRouter(prefix="/members", tags=["internal-members"])


@router.post("/sync", dependencies=[Depends(require_api_key)])
async def sync_members(members: list[MemberSyncItem], service: MemberService = Depends()):
    data = [m.model_dump(exclude_none=True) for m in members]
    synced = service.sync(data)
    return {"synced": len(synced)}


@router.post("/bulk-update-show-counts", dependencies=[Depends(require_api_key)])
async def bulk_update_show_counts(items: list[MemberShowCountItem], service: MemberService = Depends()):
    updated = 0
    for item in items:
        member = service.member_repository.get_by_jkt48_id(item.jkt48_id)
        if member:
            service.member_repository.update(member.id, {"total_show_count": item.total_show_count})
            updated += 1
    return {"updated": updated}
