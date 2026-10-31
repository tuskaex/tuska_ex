"""Custom chart indicators published from Admin → Indicators.

Both terminals fetch this once per chart load and register each entry with the
Charting Library's `custom_indicators_getter`. `js` is the body of
`function (PineJS) { ... }`; the admin API checked it before publishing.

Public, like the instrument catalogue and the bars it draws on: the desktop
terminal's account-password sessions carry an API key and no user JWT, and the
code is shipped to every trader's browser anyway, so a login hides nothing.
"""
import hashlib
import json

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.common.src.database import get_db
from packages.common.src.models import CustomIndicator

router = APIRouter()


@router.get("")
async def list_indicators(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(
            CustomIndicator.study_id, CustomIndicator.name,
            CustomIndicator.version, CustomIndicator.published_js,
        )
        .where(CustomIndicator.status == "published", CustomIndicator.published_js.isnot(None))
        .order_by(CustomIndicator.name)
    )).all()
    body = {
        "indicators": [
            {"study_id": r.study_id, "name": r.name, "version": r.version, "js": r.published_js}
            for r in rows
        ]
    }
    etag = '"' + hashlib.sha256(
        json.dumps([(r.study_id, r.version) for r in rows]).encode()
    ).hexdigest()[:32] + '"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag})
    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-cache"
    return body
