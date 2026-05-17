from fastapi import APIRouter, Depends, HTTPException, Query

from services.theater_schedule_service import TheaterScheduleService

router = APIRouter(prefix="/theater-schedules", tags=["theater-schedules"])


@router.get("/count")
async def count_theater_schedules(
    upcoming: bool = Query(False),
    past: bool = Query(False),
    ongoing: bool = Query(False),
    team: str | None = Query(None),
    setlist_name: str | None = Query(None),
    no_members: bool = Query(False),
    service: TheaterScheduleService = Depends(),
):
    return {"count": service.count(upcoming=upcoming, past=past, ongoing=ongoing, team=team, setlist_name=setlist_name, no_members=no_members)}


@router.get("/")
async def list_theater_schedules(
    upcoming: bool = Query(False),
    past: bool = Query(False),
    ongoing: bool = Query(False),
    limit: int = Query(None),
    offset: int = Query(0),
    team: str | None = Query(None),
    setlist_name: str | None = Query(None),
    no_members: bool = Query(False),
    service: TheaterScheduleService = Depends(),
):
    return service.get_all_with_members(upcoming=upcoming, past=past, ongoing=ongoing, limit=limit, offset=offset, team=team, setlist_name=setlist_name, no_members=no_members)


@router.get("/member-stats")
async def get_member_stats(
    days: int | None = Query(None, ge=1),
    service: TheaterScheduleService = Depends(),
):
    from datetime import date, timedelta
    since_date = date.today() - timedelta(days=days - 1) if days else None
    return service.get_member_stats(since_date=since_date)


@router.get("/stats/by-year")
async def shows_by_year(service: TheaterScheduleService = Depends()):
    return service.get_shows_by_year()


@router.get("/stats/top-setlists")
async def top_setlists(limit: int = Query(15), service: TheaterScheduleService = Depends()):
    return service.get_top_setlists(limit)


@router.get("/stats/setlists")
async def all_setlists(service: TheaterScheduleService = Depends()):
    return service.get_all_setlists()


@router.get("/{schedule_id}/adjacent")
async def get_adjacent_schedules(schedule_id: int, service: TheaterScheduleService = Depends()):
    return service.get_adjacent(schedule_id)


@router.get("/{schedule_id}")
async def get_theater_schedule(schedule_id: int, service: TheaterScheduleService = Depends()):
    detail = service.get_detail(schedule_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Theater schedule not found")
    return detail
