import json

from fastapi import HTTPException, status
from sqlalchemy import func, insert, select, update

from models.base import _now
from models.contribution import Contribution
from models.theater_schedule import TheaterSchedule
from sqlalchemy.orm import Session


class ContributionRepository:
  def __init__(self, db: Session):
    self.db = db

  def _row(self, c: Contribution, show: TheaterSchedule | None = None) -> dict:
    d = {
      "id": c.id,
      "contribution_type": c.contribution_type,
      "jkt48_schedule_id": c.jkt48_schedule_id,
      "theater_schedule_id": c.theater_schedule_id,
      "payload": json.loads(c.payload),
      "status": c.status,
      "contributor_name": c.contributor_name,
      "contributor_contact": c.contributor_contact,
      "contributor_note": c.contributor_note,
      "rejection_reason": c.rejection_reason,
      "reviewed_at": c.reviewed_at,
      "created_at": c.created_at,
    }
    if show:
      d["show_date"] = show.show_date.isoformat() if show.show_date else None
      d["show_time"] = show.show_time
      d["setlist_name"] = show.setlist_name
    return d

  def create(self, data: dict) -> dict:
    jkt48_schedule_id = data.get("jkt48_schedule_id") or ""
    theater_schedule_id = None
    if jkt48_schedule_id:
      show = self.db.execute(
        select(TheaterSchedule).where(
          TheaterSchedule.jkt48_schedule_id == jkt48_schedule_id,
          TheaterSchedule.deleted_at.is_(None),
        )
      ).scalar_one_or_none()
      if not show:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Show not found")
      theater_schedule_id = show.id
    row = {
      "contribution_type": data["contribution_type"],
      "jkt48_schedule_id": jkt48_schedule_id,
      "theater_schedule_id": theater_schedule_id,
      "payload": json.dumps(data["payload"]),
      "status": "pending",
      "contributor_name": data.get("contributor_name"),
      "contributor_contact": data.get("contributor_contact"),
      "contributor_note": data.get("contributor_note"),
    }
    result = self.db.execute(insert(Contribution).values(**row))
    self.db.commit()
    c = self.db.execute(
      select(Contribution).where(Contribution.id == result.inserted_primary_key[0])
    ).scalar_one()
    return {"id": c.id, "status": c.status}

  def get_all(self, status_filter: str | None = None, limit: int = 50, offset: int = 0) -> list[dict]:
    stmt = (
      select(Contribution, TheaterSchedule)
      .outerjoin(TheaterSchedule, TheaterSchedule.id == Contribution.theater_schedule_id)
      .where(Contribution.deleted_at.is_(None))
    )
    if status_filter:
      stmt = stmt.where(Contribution.status == status_filter)
    stmt = stmt.order_by(Contribution.created_at.desc()).offset(offset).limit(limit)
    rows = self.db.execute(stmt).all()
    return [self._row(c, show) for c, show in rows]

  def count(self, status_filter: str | None = None) -> int:
    stmt = select(func.count()).select_from(Contribution).where(Contribution.deleted_at.is_(None))
    if status_filter:
      stmt = stmt.where(Contribution.status == status_filter)
    return self.db.execute(stmt).scalar() or 0

  def get_by_id(self, contribution_id: int) -> Contribution | None:
    return self.db.execute(
      select(Contribution).where(
        Contribution.id == contribution_id,
        Contribution.deleted_at.is_(None),
      )
    ).scalar_one_or_none()

  def approve(self, contribution_id: int) -> None:
    self.db.execute(
      update(Contribution)
      .where(Contribution.id == contribution_id)
      .values(status="approved", reviewed_at=_now())
    )
    self.db.commit()

  def reject(self, contribution_id: int, reason: str | None) -> None:
    self.db.execute(
      update(Contribution)
      .where(Contribution.id == contribution_id)
      .values(status="rejected", rejection_reason=reason, reviewed_at=_now())
    )
    self.db.commit()
