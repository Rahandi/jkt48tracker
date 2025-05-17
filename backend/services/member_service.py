from fastapi import Depends
from sqlalchemy.orm import Session

from database import get_session
from repositories.member_repository import MemberRepository


class MemberService:
  def __init__(self, db: Session = Depends(get_session)):
    self.member_repository = MemberRepository(db)
  
  def get_all(self):
    return self.member_repository.get_all()
  
  def get_by_id(self, member_id: int):
    return self.member_repository.get_by_id(member_id)
  