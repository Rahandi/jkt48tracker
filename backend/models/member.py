from sqlalchemy import Date, Integer, String, UniqueConstraint

from models.base import Base, Column


class Member(Base):
  __tablename__ = "members"
  __table_args__ = (UniqueConstraint("jkt48_id", name="uq_members_jkt48_id"),)

  jkt48_id = Column(String(50), nullable=False)
  name = Column(String(100), nullable=False)
  nickname = Column(String(50), nullable=True)
  image_url = Column(String(255), nullable=True)
  dob = Column(Date, nullable=True)
  height = Column(Integer, nullable=True)
  blood_type = Column(String(2), nullable=True)
  horoscope = Column(String(20), nullable=True)
  twitter = Column(String(100), nullable=True)
  instagram = Column(String(100), nullable=True)
  team = Column(String(50), nullable=True)
  generation = Column(String(20), nullable=True)

  def __repr__(self):
    return f"id: {self.id}, name: {self.name}"
