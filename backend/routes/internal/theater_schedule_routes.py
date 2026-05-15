from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.internal.auth import require_api_key
from services.theater_schedule_service import TheaterScheduleService


class TheaterScheduleMemberItem(BaseModel):
    name: str
    jkt48_id: str | None = None


class TheaterScheduleSyncItem(BaseModel):
    jkt48_schedule_id: str
    show_date: str | None = None
    show_time: str | None = None
    setlist_name: str | None = None
    seitansai_members: str | None = None
    members: list[TheaterScheduleMemberItem] = []


router = APIRouter(prefix="/theater-schedules", tags=["internal-theater-schedules"])


@router.post("/sync", dependencies=[Depends(require_api_key)])
async def sync_theater_schedules(
    schedules: list[TheaterScheduleSyncItem],
    service: TheaterScheduleService = Depends(),
):
    data = [s.model_dump() for s in schedules]
    synced = service.sync(data)
    return {"synced": len(synced)}


@router.get("/untweeted", dependencies=[Depends(require_api_key)])
async def get_untweeted_schedules(service: TheaterScheduleService = Depends()):
    return service.get_untweeted()


@router.post("/{schedule_id}/mark-tweeted", dependencies=[Depends(require_api_key)])
async def mark_tweeted(schedule_id: int, service: TheaterScheduleService = Depends()):
    service.mark_tweeted(schedule_id)
    return {"ok": True}
