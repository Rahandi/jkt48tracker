from time import time

from sqlalchemy import Column, Integer
from sqlalchemy.ext.declarative import declarative_base

__base = declarative_base()
metadata = __base.metadata

def _now() -> int:
    return int(time())


class Base(__base):
  __abstract__ = True

  id = Column(Integer, primary_key=True, autoincrement=True)
  created_at = Column(Integer, nullable=False, default=_now)
  updated_at = Column(Integer, nullable=False, default=_now, onupdate=_now)
  deleted_at = Column(Integer, nullable=True)