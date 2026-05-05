from sqlalchemy import ForeignKey, Integer, String

from models.base import Base, Column


class TheaterScheduleMember(Base):
  __tablename__ = "theater_schedule_members"

  theater_schedule_id = Column(Integer, ForeignKey("theater_schedules.id"), nullable=False)
  jkt48_id = Column(String(50), nullable=True)
  name = Column(String(100), nullable=False)

  def __repr__(self):
    return f"id: {self.id}, name: {self.name}"
