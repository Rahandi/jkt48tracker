from time import time

from sqlalchemy import Column, Integer
from sqlalchemy.ext.declarative import declarative_base

__base = declarative_base()
metadata = __base.metadata

class Base(__base):
  __abstract__ = True

  id = Column(Integer, primary_key=True, autoincrement=True)
  created_at = Column(Integer, nullable=False, default=int(time()))
  updated_at = Column(Integer, nullable=False, default=int(time()))
  deleted_at = Column(Integer, nullable=True)