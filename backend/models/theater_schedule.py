from sqlalchemy import Date, Integer, String, UniqueConstraint

from models.base import Base, Column


class TheaterSchedule(Base):
  __tablename__ = "theater_schedules"
  __table_args__ = (UniqueConstraint("jkt48_schedule_id", name="uq_theater_schedules_jkt48_schedule_id"),)

  jkt48_schedule_id = Column(String(20), nullable=False)
  show_date = Column(Date, nullable=True)
  show_time = Column(String(10), nullable=True)
  setlist_name = Column(String(200), nullable=True)
  seitansai_members = Column(String(500), nullable=True)
  tweeted_at = Column(Integer, nullable=True)

  def __repr__(self):
    return f"id: {self.id}, show_date: {self.show_date}, setlist: {self.setlist_name}"
