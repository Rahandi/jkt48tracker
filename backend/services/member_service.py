from database import get_session
from fastapi import Depends
from repositories.member_repository import MemberRepository
from sqlalchemy.orm import Session


class MemberService:
  def __init__(self, db: Session = Depends(get_session)):
    self.member_repository = MemberRepository(db)

  def get_all(self, team: str | None = None):
    return self.member_repository.get_all(team=team)

  def get_by_id(self, member_id: int):
    return self.member_repository.get_by_id(member_id)

  def get_by_jkt48_id(self, jkt48_id: str):
    return self.member_repository.get_by_jkt48_id(jkt48_id)

  def get_recent_shows(self, jkt48_id: str, limit: int = 10):
    return self.member_repository.get_recent_shows(jkt48_id, limit=limit)

  def get_theater_stats(self, jkt48_id: str):
    by_year = self.member_repository.get_shows_by_year(jkt48_id)
    tracked = sum(r["count"] for r in by_year)
    total = self.member_repository.count_all_shows(jkt48_id)
    return {"total": total, "tracked": tracked, "by_year": by_year}

  def get_upcoming_birthdays(self, days: int = 30):
    return self.member_repository.get_upcoming_birthdays(days)

  def sync(self, members: list[dict]):
    results = []
    for data in members:
      member = self.member_repository.upsert(data)
      results.append(member)
    return results
