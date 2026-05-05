from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from models.theater_schedule import TheaterSchedule
from models.theater_schedule_member import TheaterScheduleMember


class TheaterScheduleRepository:
  def __init__(self, db: Session):
    self.db = db

  def get_all(self):
    statement = select(TheaterSchedule).where(TheaterSchedule.deleted_at.is_(None))
    return self.db.execute(statement).scalars().all()

  def get_by_id(self, schedule_id: int):
    statement = select(TheaterSchedule).where(
      TheaterSchedule.id == schedule_id,
      TheaterSchedule.deleted_at.is_(None),
    )
    return self.db.execute(statement).scalar_one_or_none()

  def get_by_jkt48_schedule_id(self, jkt48_schedule_id: str):
    statement = select(TheaterSchedule).where(
      TheaterSchedule.jkt48_schedule_id == jkt48_schedule_id,
      TheaterSchedule.deleted_at.is_(None),
    )
    return self.db.execute(statement).scalar_one_or_none()

  def get_members(self, theater_schedule_id: int):
    statement = select(TheaterScheduleMember).where(
      TheaterScheduleMember.theater_schedule_id == theater_schedule_id,
      TheaterScheduleMember.deleted_at.is_(None),
    )
    return self.db.execute(statement).scalars().all()

  def _replace_members(self, theater_schedule_id: int, members: list[dict]):
    """Delete existing members and insert the new set."""
    self.db.execute(
      delete(TheaterScheduleMember).where(
        TheaterScheduleMember.theater_schedule_id == theater_schedule_id
      )
    )
    for m in members:
      self.db.execute(
        insert(TheaterScheduleMember).values(
          theater_schedule_id=theater_schedule_id,
          jkt48_id=m.get("jkt48_id"),
          name=m["name"],
        )
      )

  def create(self, data: dict) -> TheaterSchedule:
    members = data.pop("members", [])
    self.db.execute(insert(TheaterSchedule).values(**data))
    self.db.commit()
    record = self.get_by_jkt48_schedule_id(data["jkt48_schedule_id"])
    self._replace_members(record.id, members)
    self.db.commit()
    return record

  def update(self, schedule_id: int, data: dict) -> TheaterSchedule:
    members = data.pop("members", [])
    self.db.execute(update(TheaterSchedule).where(TheaterSchedule.id == schedule_id).values(**data))
    self._replace_members(schedule_id, members)
    self.db.commit()
    return self.get_by_id(schedule_id)

  def upsert(self, data: dict) -> TheaterSchedule:
    existing = self.get_by_jkt48_schedule_id(data["jkt48_schedule_id"])
    if existing:
      return self.update(existing.id, data)
    return self.create(data)
