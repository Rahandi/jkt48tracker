import json

from database import get_session
from fastapi import Depends, HTTPException, status
from repositories.contribution_repository import ContributionRepository
from repositories.theater_schedule_repository import TheaterScheduleRepository
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models.member import Member


class ContributionService:
  def __init__(self, db: Session = Depends(get_session)):
    self.db = db
    self.repo = ContributionRepository(db)
    self.schedule_repo = TheaterScheduleRepository(db)

  def submit(self, data: dict) -> dict:
    return self.repo.create(data)

  def get_all(self, status_filter: str | None = None, limit: int = 50, offset: int = 0) -> list[dict]:
    return self.repo.get_all(status_filter=status_filter, limit=limit, offset=offset)

  def count(self, status_filter: str | None = None) -> int:
    return self.repo.count(status_filter=status_filter)

  def approve(self, contribution_id: int) -> dict:
    c = self.repo.get_by_id(contribution_id)
    if not c:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    if c.status != "pending":
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Contribution is already {c.status}")

    payload = json.loads(c.payload)

    if c.contribution_type == "show_members":
      if c.theater_schedule_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated show no longer exists")
      member_names: list[str] = payload.get("members", [])
      resolved = []
      for name in member_names:
        name = name.strip()
        if not name:
          continue
        match = self.db.execute(
          select(Member).where(
            (func.lower(Member.name) == name.lower()) | (func.lower(Member.nickname) == name.lower()),
            Member.deleted_at.is_(None),
          )
        ).scalar_one_or_none()
        resolved.append({"name": name, "jkt48_id": match.jkt48_id if match else None})
      self.schedule_repo.update(c.theater_schedule_id, {"members": resolved})

    elif c.contribution_type == "show_info":
      fields = {k: v for k, v in payload.items() if k in ("setlist_name", "show_date", "show_time") and v}
      if fields:
        if c.theater_schedule_id is None:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated show no longer exists")
        self.schedule_repo.update(c.theater_schedule_id, fields)

    self.repo.approve(contribution_id)
    return {"status": "approved"}

  def reject(self, contribution_id: int, reason: str | None) -> dict:
    c = self.repo.get_by_id(contribution_id)
    if not c:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    if c.status != "pending":
      raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Contribution is already {c.status}")
    self.repo.reject(contribution_id, reason)
    return {"status": "rejected"}
