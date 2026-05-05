from database import get_session
from fastapi import Depends
from repositories.theater_schedule_repository import TheaterScheduleRepository
from sqlalchemy.orm import Session


class TheaterScheduleService:
  def __init__(self, db: Session = Depends(get_session)):
    self.repo = TheaterScheduleRepository(db)

  def get_all_with_members(self):
    return self.repo.get_all_with_members()

  def get_detail(self, schedule_id: int):
    return self.repo.get_detail(schedule_id)

  def get_member_stats(self):
    return self.repo.get_member_stats()

  def get_members(self, schedule_id: int):
    return self.repo.get_members(schedule_id)

  def sync(self, schedules: list[dict]):
    return [self.repo.upsert(s) for s in schedules]
