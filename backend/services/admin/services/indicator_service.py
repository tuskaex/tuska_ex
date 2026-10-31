"""Admin Indicator Service — pasted Pine Script / MQL indicators: CRUD,
conversion, publish. Terminals read the published rows from the gateway."""
import asyncio
import logging
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import AsyncSessionLocal
from packages.common.src.models import CustomIndicator
from packages.common.src.admin_schemas import IndicatorIn
from dependencies import write_audit_log
from services import indicator_converter
from services.indicator_builtin_names import BUILTIN_STUDY_NAMES

logger = logging.getLogger("admin.indicator_service")

LANGUAGES = ("pine", "mql4", "mql5")
# A conversion still "running" after this was lost to a restart.
_STALE_CONVERSION = timedelta(minutes=15)
# Strong references: asyncio keeps only weak ones to running tasks.
_tasks: set[asyncio.Task] = set()


def _conversion_state(row: CustomIndicator) -> str:
    if (row.conversion_state == "running" and row.conversion_started_at
            and datetime.now(timezone.utc) - row.conversion_started_at > _STALE_CONVERSION):
        return "failed"
    return row.conversion_state or "idle"


def _out(row: CustomIndicator, *, full: bool) -> dict:
    state = _conversion_state(row)
    error = row.conversion_error
    if state == "failed" and row.conversion_state == "running":
        error = "The conversion was interrupted. Convert again."
    data = {
        "id": str(row.id),
        "name": row.name,
        "study_id": row.study_id,
        "source_language": row.source_language,
        "status": row.status,
        "version": row.version,
        "has_draft": bool(row.compiled_js),
        # The draft differs from what traders run: show "unpublished changes".
        "draft_differs": bool(row.compiled_js) and row.compiled_js != row.published_js,
        "unsupported_features": row.unsupported_features or [],
        "conversion_state": state,
        "conversion_error": error,
        "published_at": row.published_at,
        "updated_at": row.updated_at,
        "created_at": row.created_at,
    }
    if full:
        data.update(
            source_code=row.source_code,
            compiled_js=row.compiled_js,
            conversion_notes=row.conversion_notes or [],
        )
    return data


def _new_study_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")[:40] or "indicator"
    return f"tx_{slug}_{secrets.token_hex(3)}"


def _language(body: IndicatorIn) -> str:
    lang = body.source_language or indicator_converter.detect_language(body.source_code)
    if lang not in LANGUAGES:
        raise HTTPException(status_code=400, detail="source_language must be pine, mql4 or mql5")
    return lang


async def _check_name(name: str, db: AsyncSession, exclude_id: UUID | None = None) -> str:
    """The terminals find a study by its name, so a name already taken by a
    built-in or by another custom indicator would hide this one."""
    name = name.strip()
    if name.lower() in BUILTIN_STUDY_NAMES:
        raise HTTPException(
            status_code=400,
            detail=f'"{name}" is the name of a built-in chart indicator. Choose another name.',
        )
    q = select(CustomIndicator.id).where(func.lower(CustomIndicator.name) == name.lower())
    if exclude_id is not None:
        q = q.where(CustomIndicator.id != exclude_id)
    if (await db.execute(q)).first():
        raise HTTPException(status_code=400, detail=f'An indicator named "{name}" already exists.')
    return name


async def _get(indicator_id: UUID, db: AsyncSession) -> CustomIndicator:
    row = (await db.execute(
        select(CustomIndicator).where(CustomIndicator.id == indicator_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return row


async def list_indicators(db: AsyncSession) -> dict:
    rows = (await db.execute(
        select(CustomIndicator).order_by(CustomIndicator.created_at.desc())
    )).scalars().all()
    return {"indicators": [_out(r, full=False) for r in rows]}


async def get_indicator(indicator_id: UUID, db: AsyncSession) -> dict:
    return _out(await _get(indicator_id, db), full=True)


async def create_indicator(
    body: IndicatorIn, admin_id: uuid.UUID, ip_address: str | None, db: AsyncSession,
) -> dict:
    name = await _check_name(body.name, db)
    now = datetime.now(timezone.utc)
    row = CustomIndicator(
        name=name,
        study_id=_new_study_id(body.name),
        source_language=_language(body),
        source_code=body.source_code,
        conversion_notes=[],
        unsupported_features=[],
        status="draft",
        version=0,
        created_by=admin_id,
        updated_by=admin_id,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    await db.flush()
    await write_audit_log(
        db, admin_id, "create_indicator", "custom_indicator", row.id,
        new_values={"name": row.name, "language": row.source_language},
        ip_address=ip_address,
    )
    await db.commit()
    return _out(row, full=True)


async def update_indicator(
    indicator_id: UUID, body: IndicatorIn, admin_id: uuid.UUID,
    ip_address: str | None, db: AsyncSession,
) -> dict:
    row = await _get(indicator_id, db)
    old = {"name": row.name, "language": row.source_language}
    source_changed = body.source_code != row.source_code
    row.name = await _check_name(body.name, db, exclude_id=row.id)
    row.source_language = _language(body)
    row.source_code = body.source_code
    if source_changed:
        # The draft no longer matches the source; publishing it would ship
        # code converted from something the admin has since replaced.
        row.compiled_js = None
        row.conversion_notes = []
        row.unsupported_features = []
        row.conversion_error = None
        if row.conversion_state == "failed":
            row.conversion_state = "idle"
    row.updated_by = admin_id
    row.updated_at = datetime.now(timezone.utc)
    await write_audit_log(
        db, admin_id, "update_indicator", "custom_indicator", row.id,
        old_values=old,
        new_values={"name": row.name, "language": row.source_language, "source_changed": source_changed},
        ip_address=ip_address,
    )
    await db.commit()
    return _out(row, full=True)


async def convert_indicator(
    indicator_id: UUID, admin_id: uuid.UUID, ip_address: str | None, db: AsyncSession,
) -> dict:
    """Start a conversion in the background; the admin page polls GET."""
    row = await _get(indicator_id, db)
    if _conversion_state(row) == "running":
        raise HTTPException(status_code=409, detail="A conversion is already running.")
    indicator_converter.ensure_configured()
    row.conversion_state = "running"
    row.conversion_error = None
    row.conversion_started_at = datetime.now(timezone.utc)
    await write_audit_log(
        db, admin_id, "convert_indicator", "custom_indicator", row.id,
        new_values={"language": row.source_language}, ip_address=ip_address,
    )
    await db.commit()

    task = asyncio.create_task(_run_conversion(row.id, row.source_code, row.source_language, admin_id))
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return _out(row, full=True)


async def _run_conversion(indicator_id: UUID, source: str, language: str, admin_id: uuid.UUID) -> None:
    out, error = None, None
    try:
        out = await indicator_converter.convert(source, language)
    except HTTPException as e:
        error = str(e.detail)
    except Exception:
        logger.exception("indicator conversion crashed")
        error = "The conversion failed unexpectedly. Try again."

    async with AsyncSessionLocal() as db:
        row = (await db.execute(
            select(CustomIndicator).where(CustomIndicator.id == indicator_id)
        )).scalar_one_or_none()
        if row is None:
            return  # deleted while converting
        if row.source_code != source:
            row.conversion_state = "failed"
            row.conversion_error = "The code was edited during conversion. Convert again."
        elif error:
            row.conversion_state = "failed"
            row.conversion_error = error
        else:
            row.compiled_js = out["js_factory_body"]
            row.unsupported_features = out["unsupported_features"]
            row.conversion_notes = out["notes"]
            row.conversion_state = "idle"
            row.conversion_error = None
        row.updated_by = admin_id
        row.updated_at = datetime.now(timezone.utc)
        await db.commit()


async def publish_indicator(
    indicator_id: UUID, admin_id: uuid.UUID, ip_address: str | None, db: AsyncSession,
) -> dict:
    row = await _get(indicator_id, db)
    if not row.compiled_js:
        raise HTTPException(status_code=400, detail="Convert the code before publishing.")
    # Re-check at publish time too: the checker may have been tightened since
    # this draft was converted.
    try:
        indicator_converter.check_factory_body(row.compiled_js)
    except indicator_converter.UnsafeIndicatorCode as e:
        raise HTTPException(status_code=422, detail=f"{e} Convert again before publishing.")
    old = {"status": row.status, "version": row.version}
    now = datetime.now(timezone.utc)
    row.published_js = row.compiled_js
    row.version = (row.version or 0) + 1
    row.status = "published"
    row.published_at = now
    row.updated_by = admin_id
    row.updated_at = now
    await write_audit_log(
        db, admin_id, "publish_indicator", "custom_indicator", row.id,
        old_values=old, new_values={"status": row.status, "version": row.version},
        ip_address=ip_address,
    )
    await db.commit()
    return _out(row, full=True)


async def disable_indicator(
    indicator_id: UUID, admin_id: uuid.UUID, ip_address: str | None, db: AsyncSession,
) -> dict:
    row = await _get(indicator_id, db)
    old = {"status": row.status}
    row.status = "disabled"
    row.updated_by = admin_id
    row.updated_at = datetime.now(timezone.utc)
    await write_audit_log(
        db, admin_id, "disable_indicator", "custom_indicator", row.id,
        old_values=old, new_values={"status": "disabled"}, ip_address=ip_address,
    )
    await db.commit()
    return _out(row, full=True)


async def delete_indicator(
    indicator_id: UUID, admin_id: uuid.UUID, ip_address: str | None, db: AsyncSession,
) -> dict:
    row = await _get(indicator_id, db)
    await db.delete(row)
    await write_audit_log(
        db, admin_id, "delete_indicator", "custom_indicator", indicator_id,
        new_values={"deleted": True, "name": row.name}, ip_address=ip_address,
    )
    await db.commit()
    return {"message": "Indicator deleted"}
