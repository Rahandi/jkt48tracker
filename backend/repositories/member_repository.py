from datetime import date

from sqlalchemy import delete, distinct, extract, func, insert, or_, select, update
from sqlalchemy.orm import Session

from models.member import Member
from models.theater_schedule import TheaterSchedule
from models.theater_schedule_member import TheaterScheduleMember


class MemberRepository:
  def __init__(self, db: Session):
    self.db = db

  def get_all(self, team: str | None = None):
    statement = select(Member).where(Member.deleted_at.is_(None))
    if team:
      statement = statement.where(Member.team == team.upper())
    result = self.db.execute(statement)
    return result.scalars().all()

  def get_by_id(self, member_id: int):
    statement = select(Member).where(Member.id == member_id, Member.deleted_at.is_(None))
    result = self.db.execute(statement)
    return result.scalar_one_or_none()

  def get_by_jkt48_id(self, jkt48_id: str):
    statement = select(Member).where(Member.jkt48_id == jkt48_id, Member.deleted_at.is_(None))
    result = self.db.execute(statement)
    return result.scalar_one_or_none()

  def create(self, data: dict):
    statement = insert(Member).values(**data)
    self.db.execute(statement)
    self.db.commit()
    return self.get_by_jkt48_id(data["jkt48_id"])

  def update(self, member_id: int, data: dict):
    statement = update(Member).where(Member.id == member_id).values(**data)
    self.db.execute(statement)
    self.db.commit()
    return self.get_by_id(member_id)

  def upsert(self, data: dict):
    existing = self.get_by_jkt48_id(data["jkt48_id"])
    if existing:
      return self.update(existing.id, data)
    return self.create(data)

  def count_all_shows(self, jkt48_id: str) -> int:
    """Total show count: past performed shows + shadow/untracked entries (null date)."""
    stmt = (
      select(func.count(distinct(TheaterSchedule.id)))
      .join(TheaterScheduleMember, TheaterScheduleMember.theater_schedule_id == TheaterSchedule.id)
      .where(
        TheaterScheduleMember.jkt48_id == jkt48_id,
        TheaterScheduleMember.deleted_at.is_(None),
        TheaterSchedule.deleted_at.is_(None),
        or_(
          TheaterSchedule.show_date < date.today(),
          TheaterSchedule.show_date.is_(None),
        ),
      )
    )
    return self.db.execute(stmt).scalar() or 0

  def get_shows_by_year(self, jkt48_id: str) -> list[dict]:
    stmt = (
      select(
        extract("year", TheaterSchedule.show_date).label("year"),
        func.count(distinct(TheaterSchedule.id)).label("count"),
      )
      .join(TheaterScheduleMember, TheaterScheduleMember.theater_schedule_id == TheaterSchedule.id)
      .where(
        TheaterScheduleMember.jkt48_id == jkt48_id,
        TheaterScheduleMember.deleted_at.is_(None),
        TheaterSchedule.deleted_at.is_(None),
        TheaterSchedule.show_date.isnot(None),
        TheaterSchedule.show_date < date.today(),
      )
      .group_by("year")
      .order_by("year")
    )
    return [{"year": int(r.year), "count": r.count} for r in self.db.execute(stmt).all()]

  def get_recent_shows(self, jkt48_id: str, limit: int = 10, past_only: bool = True) -> list[dict]:
    stmt = (
      select(TheaterSchedule)
      .join(TheaterScheduleMember, TheaterScheduleMember.theater_schedule_id == TheaterSchedule.id)
      .where(
        TheaterScheduleMember.jkt48_id == jkt48_id,
        TheaterScheduleMember.deleted_at.is_(None),
        TheaterSchedule.deleted_at.is_(None),
      )
    )
    if past_only:
      stmt = stmt.where(TheaterSchedule.show_date < date.today())
    stmt = stmt.order_by(TheaterSchedule.show_date.desc(), TheaterSchedule.show_time.desc()).limit(limit)
    return [
      {
        "id": s.id,
        "show_date": s.show_date.isoformat() if s.show_date else None,
        "show_time": s.show_time,
        "setlist_name": s.setlist_name,
      }
      for s in self.db.execute(stmt).scalars().all()
    ]

  def get_upcoming_birthdays(self, days: int = 30) -> list[dict]:
    today = date.today()
    stmt = select(Member).where(Member.deleted_at.is_(None), Member.dob.isnot(None))
    members = self.db.execute(stmt).scalars().all()
    result = []
    for m in members:
      dob = m.dob
      try:
        bday = dob.replace(year=today.year)
      except ValueError:
        bday = dob.replace(year=today.year, month=2, day=28)
      if bday < today:
        try:
          bday = dob.replace(year=today.year + 1)
        except ValueError:
          bday = dob.replace(year=today.year + 1, month=2, day=28)
      delta = (bday - today).days
      if 0 <= delta <= days:
        result.append({
          "jkt48_id": m.jkt48_id,
          "name": m.name,
          "nickname": m.nickname,
          "image_url": m.image_url,
          "team": m.team,
          "dob": m.dob.isoformat(),
          "days_until": delta,
          "next_birthday": bday.isoformat(),
        })
    result.sort(key=lambda x: x["days_until"])
    return result

  def delete(self, member_id: int):
    statement = delete(Member).where(Member.id == member_id)
    self.db.execute(statement)
    self.db.commit()
    return True
