from database import get_session
from fastapi import Depends
from repositories.theater_schedule_repository import TheaterScheduleRepository
from sqlalchemy.orm import Session


class TheaterScheduleService:
  def __init__(self, db: Session = Depends(get_session)):
    self.repo = TheaterScheduleRepository(db)

  def get_all_with_members(self, upcoming: bool = False, past: bool = False, ongoing: bool = False, limit: int | None = None, offset: int = 0, team: str | None = None, setlist_name: str | None = None, no_members: bool = False):
    return self.repo.get_all_with_members(upcoming=upcoming, past=past, ongoing=ongoing, limit=limit, offset=offset, team=team, setlist_name=setlist_name, no_members=no_members)

  def count(self, upcoming: bool = False, past: bool = False, ongoing: bool = False, team: str | None = None, setlist_name: str | None = None, no_members: bool = False) -> int:
    return self.repo.count_all(upcoming=upcoming, past=past, ongoing=ongoing, team=team, setlist_name=setlist_name, no_members=no_members)

  def get_all_setlists(self):
    return self.repo.get_all_setlists()

  def get_detail(self, schedule_id: int):
    return self.repo.get_detail(schedule_id)

  def get_member_stats(self):
    return self.repo.get_member_stats()

  def get_shows_by_year(self):
    return self.repo.get_shows_by_year()

  def get_top_setlists(self, limit: int = 15):
    return self.repo.get_top_setlists(limit)

  def get_adjacent(self, schedule_id: int):
    return self.repo.get_adjacent(schedule_id)

  def get_members(self, schedule_id: int):
    return self.repo.get_members(schedule_id)

  def sync(self, schedules: list[dict]):
    return [self.repo.upsert(s) for s in schedules]
