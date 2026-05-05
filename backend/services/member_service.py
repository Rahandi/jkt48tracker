from database import get_session
from fastapi import Depends
from repositories.member_repository import MemberRepository
from sqlalchemy.orm import Session


class MemberService:
  def __init__(self, db: Session = Depends(get_session)):
    self.member_repository = MemberRepository(db)

  def get_all(self):
    return self.member_repository.get_all()

  def get_by_id(self, member_id: int):
    return self.member_repository.get_by_id(member_id)

  def get_by_jkt48_id(self, jkt48_id: str):
    return self.member_repository.get_by_jkt48_id(jkt48_id)

  def sync(self, members: list[dict]):
    results = []
    for data in members:
      member = self.member_repository.upsert(data)
      results.append(member)
    return results
