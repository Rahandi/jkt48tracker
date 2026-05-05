from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from models.member import Member


class MemberRepository:
  def __init__(self, db: Session):
    self.db = db

  def get_all(self):
    statement = select(Member).where(Member.deleted_at.is_(None))
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

  def delete(self, member_id: int):
    statement = delete(Member).where(Member.id == member_id)
    self.db.execute(statement)
    self.db.commit()
    return True
