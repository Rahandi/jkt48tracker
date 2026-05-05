import os

import sqlalchemy as db
from sqlalchemy.orm import sessionmaker


class Database:
  def __init__(self):
    self.host = os.getenv("DATABASE_HOST")
    self.port = os.getenv("DATABASE_PORT")
    self.name = os.getenv("DATABASE_NAME")
    self.username = os.getenv("DATABASE_USER")
    self.password = os.getenv("DATABASE_PASS")
    if self.host:
      self.url = f"mysql+pymysql://{self.username}:{self.password}@{self.host}:{self.port}/{self.name}"
    else:
      self.url = "sqlite:///./jkt48tracker.db"

    self.engine = db.create_engine(self.url, connect_args={"check_same_thread": False} if not self.host else {})
    self.session_factory = sessionmaker(bind=self.engine)
  
  def get_session(self):
    session = self.session_factory()
    try:
      yield session
    finally:
      session.close()

database = Database()
def get_session():
  yield from database.get_session()