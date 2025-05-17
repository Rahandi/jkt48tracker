from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from models.member import Member


class MemberRepository:
  def __init__(self, db: Session):
    self.db = db

  def get_all(self):
    statement = select(Member)
    result = self.db.execute(statement)
    return result.scalars().all()
  
  def get_by_id(self, member_id: int):
    statement = select(Member).where(Member.id == member_id)
    result = self.db.execute(statement)
    return result.scalar_one_or_none()
  
  def create(self, member: Member):
    statement = insert(Member).values(
      name=member.name,
      nickname=member.nickname,
      dob=member.dob,
      height=member.height,
      blood_type=member.blood_type,
      horoscope=member.horoscope,
      twitter=member.twitter,
      instagram=member.instagram
    )
    self.db.execute(statement)
    self.db.commit()
    self.db.refresh(member)
    return member
  
  def update(self, member_id: int, member: Member):
    statement = update(Member).where(Member.id == member_id).values(
      name=member.name,
      nickname=member.nickname,
      dob=member.dob,
      height=member.height,
      blood_type=member.blood_type,
      horoscope=member.horoscope,
      twitter=member.twitter,
      instagram=member.instagram
    )
    self.db.execute(statement)
    self.db.commit()
    return member
  
  def delete(self, member_id: int):
    statement = delete(Member).where(Member.id == member_id)
    self.db.execute(statement)
    self.db.commit()
    return True