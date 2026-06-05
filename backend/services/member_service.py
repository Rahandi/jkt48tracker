from database import get_session
from fastapi import Depends
from repositories.member_repository import MemberRepository
from sqlalchemy.orm import Session


class MemberService:
  def __init__(self, db: Session = Depends(get_session)):
    self.member_repository = MemberRepository(db)

  def get_all(self, team: str | None = None, generation: str | None = None, include_graduated: bool = False):
    return self.member_repository.get_all(team=team, generation=generation, include_graduated=include_graduated)

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

  # Minimum plausible active-member count — guards against marking everyone
  # graduated when the scrape returns 0 due to a Cloudflare block or error.
  _MIN_MEMBERS_FOR_GRADUATION_DETECTION = 10

  def sync(self, members: list[dict], detect_graduations: bool = False) -> dict:
    results = []
    for data in members:
      member = self.member_repository.upsert(data)
      results.append(member)

    graduated_count = 0
    if detect_graduations and len(members) >= self._MIN_MEMBERS_FOR_GRADUATION_DETECTION:
      incoming_ids = {m["jkt48_id"] for m in members}
      active_ids = self.member_repository.get_active_jkt48_ids()
      missing_ids = list(active_ids - incoming_ids)
      if missing_ids:
        graduated_count = self.member_repository.mark_graduated(missing_ids)

    return {"synced": len(results), "graduated": graduated_count}
