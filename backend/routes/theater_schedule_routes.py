from fastapi import APIRouter, Depends, HTTPException

from services.theater_schedule_service import TheaterScheduleService

router = APIRouter(prefix="/theater-schedules", tags=["theater-schedules"])


@router.get("/")
async def list_theater_schedules(service: TheaterScheduleService = Depends()):
    return service.get_all()


@router.get("/{schedule_id}")
async def get_theater_schedule(schedule_id: int, service: TheaterScheduleService = Depends()):
    schedule = service.get_by_id(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail="Theater schedule not found")
    members = service.get_members(schedule_id)
    return {**schedule.__dict__, "members": [m.__dict__ for m in members]}
