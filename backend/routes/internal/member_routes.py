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


router = APIRouter(prefix="/members", tags=["internal-members"])


@router.post("/sync", dependencies=[Depends(require_api_key)])
async def sync_members(members: list[MemberSyncItem], service: MemberService = Depends()):
    data = [m.model_dump(exclude_none=True) for m in members]
    synced = service.sync(data)
    return {"synced": len(synced)}
