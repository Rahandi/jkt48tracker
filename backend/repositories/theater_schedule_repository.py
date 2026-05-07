from datetime import date

from sqlalchemy import and_, delete, distinct, extract, func, insert, or_, select, update
from sqlalchemy.orm import Session

from models.member import Member
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
        "seitansai_members": s.seitansai_members,
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

  def _base_statement(self, upcoming: bool = False, past: bool = False, team: str | None = None, setlist_name: str | None = None):
    stmt = select(TheaterSchedule).where(TheaterSchedule.deleted_at.is_(None))
    if setlist_name:
      stmt = stmt.where(TheaterSchedule.setlist_name == setlist_name)
    if team:
      member_ids = select(Member.jkt48_id).where(
        Member.team == team.upper(), Member.deleted_at.is_(None)
      )
      stmt = stmt.join(
        TheaterScheduleMember,
        TheaterScheduleMember.theater_schedule_id == TheaterSchedule.id,
      ).where(TheaterScheduleMember.jkt48_id.in_(member_ids)).distinct()
    if upcoming:
      stmt = stmt.where(TheaterSchedule.show_date >= date.today())
      stmt = stmt.order_by(TheaterSchedule.show_date.asc(), TheaterSchedule.show_time.asc())
    elif past:
      stmt = stmt.where(TheaterSchedule.show_date < date.today())
      stmt = stmt.order_by(TheaterSchedule.show_date.desc(), TheaterSchedule.show_time.desc())
    else:
      stmt = stmt.order_by(TheaterSchedule.show_date.desc(), TheaterSchedule.show_time.desc())
    return stmt

  def get_all(self, upcoming: bool = False, past: bool = False, limit: int | None = None, offset: int = 0, team: str | None = None, setlist_name: str | None = None):
    stmt = self._base_statement(upcoming=upcoming, past=past, team=team, setlist_name=setlist_name)
    if offset:
      stmt = stmt.offset(offset)
    if limit is not None:
      stmt = stmt.limit(limit)
    return self.db.execute(stmt).scalars().all()

  def count_all(self, upcoming: bool = False, past: bool = False, team: str | None = None, setlist_name: str | None = None) -> int:
    base = self._base_statement(upcoming=upcoming, past=past, team=team, setlist_name=setlist_name)
    count_stmt = select(func.count()).select_from(base.subquery())
    return self.db.execute(count_stmt).scalar() or 0

  def get_all_with_members(self, upcoming: bool = False, past: bool = False, limit: int | None = None, offset: int = 0, team: str | None = None, setlist_name: str | None = None) -> list[dict]:
    schedules = self.get_all(upcoming=upcoming, past=past, limit=limit, offset=offset, team=team, setlist_name=setlist_name)
    return [_schedule_row(s, self.get_members(s.id)) for s in schedules]

  def get_all_setlists(self) -> list[dict]:
    stmt = (
      select(
        TheaterSchedule.setlist_name,
        func.count().label("count"),
        func.min(TheaterSchedule.show_date).label("first_date"),
        func.max(TheaterSchedule.show_date).label("last_date"),
      )
      .where(
        TheaterSchedule.deleted_at.is_(None),
        TheaterSchedule.setlist_name.isnot(None),
      )
      .group_by(TheaterSchedule.setlist_name)
      .order_by(func.count().desc())
    )
    return [
      {
        "setlist_name": r.setlist_name,
        "count": r.count,
        "first_date": r.first_date.isoformat() if r.first_date else None,
        "last_date": r.last_date.isoformat() if r.last_date else None,
      }
      for r in self.db.execute(stmt).all()
    ]

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
    row = _schedule_row(s, self.get_members(schedule_id))
    if s.setlist_name:
      count_stmt = select(func.count()).where(
        TheaterSchedule.deleted_at.is_(None),
        TheaterSchedule.setlist_name == s.setlist_name,
      )
      row["setlist_total_count"] = self.db.execute(count_stmt).scalar()
      related_stmt = (
        select(TheaterSchedule)
        .where(
          TheaterSchedule.deleted_at.is_(None),
          TheaterSchedule.setlist_name == s.setlist_name,
          TheaterSchedule.id != schedule_id,
          TheaterSchedule.show_date.isnot(None),
        )
        .order_by(TheaterSchedule.show_date.desc())
        .limit(5)
      )
      related = self.db.execute(related_stmt).scalars().all()
      row["related_shows"] = [
        {"id": r.id, "show_date": r.show_date.isoformat(), "show_time": r.show_time}
        for r in related
      ]
    return row

  def get_adjacent(self, schedule_id: int) -> dict:
    current = self.get_by_id(schedule_id)
    if not current or not current.show_date:
      return {"prev": None, "next": None}

    def _mini(s):
      if not s:
        return None
      return {"id": s.id, "show_date": s.show_date.isoformat() if s.show_date else None, "show_time": s.show_time, "setlist_name": s.setlist_name}

    prev_stmt = (
      select(TheaterSchedule)
      .where(
        TheaterSchedule.deleted_at.is_(None),
        TheaterSchedule.id != schedule_id,
        TheaterSchedule.show_date.isnot(None),
        or_(
          TheaterSchedule.show_date < current.show_date,
          and_(TheaterSchedule.show_date == current.show_date, TheaterSchedule.show_time < current.show_time),
        ),
      )
      .order_by(TheaterSchedule.show_date.desc(), TheaterSchedule.show_time.desc())
      .limit(1)
    )
    next_stmt = (
      select(TheaterSchedule)
      .where(
        TheaterSchedule.deleted_at.is_(None),
        TheaterSchedule.id != schedule_id,
        TheaterSchedule.show_date.isnot(None),
        or_(
          TheaterSchedule.show_date > current.show_date,
          and_(TheaterSchedule.show_date == current.show_date, TheaterSchedule.show_time > current.show_time),
        ),
      )
      .order_by(TheaterSchedule.show_date.asc(), TheaterSchedule.show_time.asc())
      .limit(1)
    )
    return {
      "prev": _mini(self.db.execute(prev_stmt).scalar_one_or_none()),
      "next": _mini(self.db.execute(next_stmt).scalar_one_or_none()),
    }

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

  def get_shows_by_year(self) -> list[dict]:
    stmt = (
      select(
        extract("year", TheaterSchedule.show_date).label("year"),
        func.count().label("count"),
      )
      .where(TheaterSchedule.deleted_at.is_(None), TheaterSchedule.show_date.isnot(None))
      .group_by("year")
      .order_by("year")
    )
    return [{"year": int(r.year), "count": r.count} for r in self.db.execute(stmt).all()]

  def get_top_setlists(self, limit: int = 15) -> list[dict]:
    stmt = (
      select(
        TheaterSchedule.setlist_name,
        func.count().label("count"),
      )
      .where(TheaterSchedule.deleted_at.is_(None), TheaterSchedule.setlist_name.isnot(None))
      .group_by(TheaterSchedule.setlist_name)
      .order_by(func.count().desc())
      .limit(limit)
    )
    return [{"setlist_name": r.setlist_name, "count": r.count} for r in self.db.execute(stmt).all()]

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
