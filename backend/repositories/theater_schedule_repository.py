from sqlalchemy import delete, distinct, func, insert, select, update
from sqlalchemy.orm import Session

from models.theater_schedule import TheaterSchedule
from models.theater_schedule_member import TheaterScheduleMember


def _member_row(m: TheaterScheduleMember) -> dict:
    return {"id": m.id, "name": m.name, "jkt48_id": m.jkt48_id}


def _schedule_row(s: TheaterSchedule, members: list[TheaterScheduleMember] | None = None) -> dict:
    d: dict = {
        "id": s.id,
        "jkt48_schedule_id": s.jkt48_schedule_id,
        "show_date": s.show_date.isoformat() if s.show_date else None,
        "show_time": s.show_time,
        "setlist_name": s.setlist_name,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }
    if members is not None:
        d["members"] = [_member_row(m) for m in members]
        d["member_count"] = len(members)
    return d


class TheaterScheduleRepository:
  def __init__(self, db: Session):
    self.db = db

  def get_all(self):
    statement = select(TheaterSchedule).where(TheaterSchedule.deleted_at.is_(None))
    return self.db.execute(statement).scalars().all()

  def get_all_with_members(self) -> list[dict]:
    schedules = self.get_all()
    return [_schedule_row(s, self.get_members(s.id)) for s in schedules]

  def get_by_id(self, schedule_id: int):
    statement = select(TheaterSchedule).where(
      TheaterSchedule.id == schedule_id,
      TheaterSchedule.deleted_at.is_(None),
    )
    return self.db.execute(statement).scalar_one_or_none()

  def get_detail(self, schedule_id: int) -> dict | None:
    s = self.get_by_id(schedule_id)
    if not s:
      return None
    return _schedule_row(s, self.get_members(schedule_id))

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

  def get_member_stats(self) -> list[dict]:
    """Members ranked by number of distinct shows they appear in."""
    stmt = (
      select(
        TheaterScheduleMember.jkt48_id,
        TheaterScheduleMember.name,
        func.count(distinct(TheaterScheduleMember.theater_schedule_id)).label("show_count"),
      )
      .join(TheaterSchedule, TheaterSchedule.id == TheaterScheduleMember.theater_schedule_id)
      .where(
        TheaterScheduleMember.deleted_at.is_(None),
        TheaterSchedule.deleted_at.is_(None),
      )
      .group_by(TheaterScheduleMember.jkt48_id, TheaterScheduleMember.name)
      .order_by(func.count(distinct(TheaterScheduleMember.theater_schedule_id)).desc())
    )
    return [
      {"jkt48_id": r.jkt48_id, "name": r.name, "show_count": r.show_count}
      for r in self.db.execute(stmt).all()
    ]

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
