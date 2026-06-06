"""
Interaction repository — database operations for the interactions table.
"""
import uuid


class InteractionRepository:
    """Data access for capsule interactions."""

    async def create(self, db, capsule_id: str, user_id: str | None,
                     action: str, reaction: str | None = None) -> str:
        interaction_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO interactions (id, capsule_id, user_id, action, reaction)
               VALUES (?, ?, ?, ?, ?)""",
            (interaction_id, capsule_id, user_id, action, reaction),
        )
        await db.commit()
        return interaction_id
