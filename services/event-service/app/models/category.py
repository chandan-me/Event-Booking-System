from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base


class EventCategory(Base):
    __tablename__ = "event_categories"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)

    events = relationship("Event", back_populates="category")

    def __repr__(self):
        return f"<EventCategory id={self.id} name={self.name}>"
