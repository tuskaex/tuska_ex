"""Custom chart indicators converted from pasted Pine Script / MQL."""
import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..database import Base


class CustomIndicator(Base):
    __tablename__ = "custom_indicators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    # Stable metainfo id saved in traders' layouts. Never changes after create.
    study_id = Column(String(80), nullable=False, unique=True)
    source_language = Column(String(10), nullable=False, default="pine")
    source_code = Column(Text, nullable=False)
    # Draft output of the converter: the body of `function (PineJS) { ... }`.
    compiled_js = Column(Text)
    conversion_notes = Column(JSONB, nullable=False, default=list)
    unsupported_features = Column(JSONB, nullable=False, default=list)
    # idle | running | failed — conversion runs in the background.
    conversion_state = Column(String(10), nullable=False, default="idle")
    conversion_error = Column(Text)
    conversion_started_at = Column(DateTime(timezone=True))
    status = Column(String(12), nullable=False, default="draft")
    # What the terminals run. Only Publish writes it.
    published_js = Column(Text)
    version = Column(Integer, nullable=False, default=0)
    published_at = Column(DateTime(timezone=True))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
