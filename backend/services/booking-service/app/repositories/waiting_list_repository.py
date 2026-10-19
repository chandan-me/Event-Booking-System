from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, or_
from app.models.waiting_list import WaitingList


class WaitingListRepository:
    def get_by_id(self, db: Session, entry_id: int) -> Optional[WaitingList]:
        return db.execute(select(WaitingList).where(WaitingList.id == entry_id)).scalar_one_or_none()

    def get_by_event_and_email(self, db: Session, event_id: int, email: str) -> Optional[WaitingList]:
        return db.execute(
            select(WaitingList).where(
                WaitingList.event_id == event_id,
                func.lower(WaitingList.customer_email) == email.strip().lower(),
                WaitingList.status.in_(["WAITING", "NOTIFIED"])
            )
        ).scalar_one_or_none()

    def count_waiting_before(self, db: Session, event_id: int, created_at: datetime) -> int:
        query = select(func.count(WaitingList.id)).where(
            WaitingList.event_id == event_id,
            WaitingList.status == "WAITING",
            WaitingList.created_at <= created_at
        )
        return int(db.execute(query).scalar_one() or 0)

    def total_waiting_for_event(self, db: Session, event_id: int) -> int:
        query = select(func.count(WaitingList.id)).where(
            WaitingList.event_id == event_id,
            WaitingList.status == "WAITING"
        )
        return int(db.execute(query).scalar_one() or 0)

    def create_or_update_entry(self, db: Session, data: dict) -> Tuple[WaitingList, bool]:
        """
        Creates a new waiting list entry, or updates existing if user already in WAITING status.
        Returns (WaitingList, is_created: bool).
        """
        email = data.get("customer_email", "").strip().lower()
        event_id = data.get("event_id")

        existing = self.get_by_event_and_email(db, event_id, email)
        if existing:
            existing.quantity = data.get("quantity", existing.quantity)
            existing.customer_name = data.get("customer_name") or existing.customer_name
            existing.preferred_tier = data.get("preferred_tier") or existing.preferred_tier
            existing.notes = data.get("notes") or existing.notes
            existing.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing)
            return existing, False

        entry = WaitingList(
            event_id=event_id,
            customer_id=data.get("customer_id", 0),
            customer_email=email,
            customer_name=data.get("customer_name"),
            quantity=data.get("quantity", 1),
            preferred_tier=data.get("preferred_tier", "General Admission"),
            notes=data.get("notes"),
            status="WAITING"
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry, True

    def list_by_event(self, db: Session, event_id: int, status: Optional[str] = None) -> List[WaitingList]:
        query = select(WaitingList).where(WaitingList.event_id == event_id)
        if status:
            query = query.where(WaitingList.status == status)
        query = query.order_by(WaitingList.created_at.asc())
        return list(db.execute(query).scalars().all())

    def list_by_events(self, db: Session, event_ids: List[int]) -> List[WaitingList]:
        if not event_ids:
            return []
        query = select(WaitingList).where(WaitingList.event_id.in_(event_ids)).order_by(WaitingList.created_at.desc())
        return list(db.execute(query).scalars().all())

    def list_by_customer(self, db: Session, customer_id: int, email: Optional[str] = None) -> List[WaitingList]:
        conditions = [WaitingList.customer_id == customer_id]
        if email:
            conditions.append(func.lower(WaitingList.customer_email) == email.strip().lower())
        query = select(WaitingList).where(or_(*conditions)).order_by(WaitingList.created_at.desc())
        return list(db.execute(query).scalars().all())

    def list_all(
        self,
        db: Session,
        event_id: Optional[int] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Tuple[List[WaitingList], int]:
        query = select(WaitingList)
        if event_id:
            query = query.where(WaitingList.event_id == event_id)
        if status:
            query = query.where(WaitingList.status == status)

        count_query = select(func.count()).select_from(query.subquery())
        total = db.execute(count_query).scalar_one()

        offset = (page - 1) * page_size
        items = list(
            db.execute(
                query.order_by(WaitingList.created_at.desc()).offset(offset).limit(page_size)
            ).scalars().all()
        )
        return items, total

    def update_status(self, db: Session, entry_id: int, new_status: str) -> Optional[WaitingList]:
        entry = self.get_by_id(db, entry_id)
        if not entry:
            return None
        entry.status = new_status
        entry.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(entry)
        return entry
