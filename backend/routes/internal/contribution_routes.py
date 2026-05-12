from fastapi import APIRouter, Depends
from pydantic import BaseModel

from routes.internal.auth import require_api_key
from services.contribution_service import ContributionService

router = APIRouter(prefix="/contributions", tags=["internal-contributions"])


class RejectBody(BaseModel):
    reason: str | None = None


@router.get("/", dependencies=[Depends(require_api_key)])
async def list_contributions(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    service: ContributionService = Depends(),
):
    return service.get_all(status_filter=status, limit=limit, offset=offset)


@router.get("/count", dependencies=[Depends(require_api_key)])
async def count_contributions(
    status: str | None = None,
    service: ContributionService = Depends(),
):
    return {"count": service.count(status_filter=status)}


@router.post("/{contribution_id}/approve", dependencies=[Depends(require_api_key)])
async def approve_contribution(
    contribution_id: int,
    service: ContributionService = Depends(),
):
    return service.approve(contribution_id)


@router.post("/{contribution_id}/reject", dependencies=[Depends(require_api_key)])
async def reject_contribution(
    contribution_id: int,
    body: RejectBody = RejectBody(),
    service: ContributionService = Depends(),
):
    return service.reject(contribution_id, body.reason)
