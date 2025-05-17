from sqlalchemy import Integer, String

from models.base import Base, Column


class Member(Base):
  __tablename__ = "members"

  name = Column(String(50), nullable=False)
  nickname = Column(String(50), nullable=False)
  dob = Column(String(8), nullable=False)
  height = Column(Integer, nullable=False)
  blood_type = Column(String(2), nullable=False)
  horoscope = Column(String(20), nullable=False)
  twitter = Column(String(50), nullable=False)
  instagram = Column(String(50), nullable=False)

  def __repr__(self):
    return f"id: {self.id}, name: {self.name}"
