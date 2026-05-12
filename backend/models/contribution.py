from sqlalchemy import ForeignKey, Integer, String, Text

from models.base import Base, Column


class Contribution(Base):
  __tablename__ = "contributions"

  contribution_type = Column(String(50), nullable=False)
  jkt48_schedule_id = Column(String(20), nullable=False)
  theater_schedule_id = Column(Integer, ForeignKey("theater_schedules.id"), nullable=True)
  payload = Column(Text, nullable=False)
  status = Column(String(20), nullable=False, default="pending")
  contributor_name = Column(String(100), nullable=True)
  contributor_contact = Column(String(200), nullable=True)
  contributor_note = Column(Text, nullable=True)
  rejection_reason = Column(Text, nullable=True)
  reviewed_at = Column(Integer, nullable=True)
