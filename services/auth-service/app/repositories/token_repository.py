from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, update
from app.models.refresh_token import RefreshToken


class TokenRepository:
    def create_refresh_token(self, db: Session, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        token_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            revoked_at=None,
            replaced_by=None
        )
        db.add(token_record)
        db.commit()
        db.refresh(token_record)
        return token_record

    def get_by_hash(self, db: Session, token_hash: str) -> RefreshToken | None:
        return db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        ).scalar_one_or_none()

    def revoke(self, db: Session, token: RefreshToken, replaced_by: str | None = None) -> RefreshToken:
        token.revoked_at = datetime.now(timezone.utc)
        token.replaced_by = replaced_by
        db.add(token)
        db.commit()
        db.refresh(token)
        return token

    def revoke_all_for_user(self, db: Session, user_id: int) -> None:
        db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None)
            )
            .values(revoked_at=datetime.now(timezone.utc))
        )
        db.commit()
