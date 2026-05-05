from fastapi import APIRouter, Depends, HTTPException

from services.theater_schedule_service import TheaterScheduleService

router = APIRouter(prefix="/theater-schedules", tags=["theater-schedules"])


@router.get("/")
async def list_theater_schedules(service: TheaterScheduleService = Depends()):
    return service.get_all_with_members()


@router.get("/member-stats")
async def get_member_stats(service: TheaterScheduleService = Depends()):
    return service.get_member_stats()


@router.get("/{schedule_id}")
async def get_theater_schedule(schedule_id: int, service: TheaterScheduleService = Depends()):
    detail = service.get_detail(schedule_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Theater schedule not found")
    return detail
