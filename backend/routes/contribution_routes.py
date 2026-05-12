from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, model_validator

from services.contribution_service import ContributionService

router = APIRouter(prefix="/contributions", tags=["contributions"])


class ContributionPayload(BaseModel):
    members: list[str] | None = None
    setlist_name: str | None = None
    show_date: str | None = None
    show_time: str | None = None


class ContributionSubmit(BaseModel):
    contribution_type: Literal["show_members", "show_info"]
    jkt48_schedule_id: str
    payload: ContributionPayload
    contributor_name: str | None = None
    contributor_contact: str | None = None
    contributor_note: str | None = None

    @model_validator(mode="after")
    def validate_payload(self):
        if self.contribution_type == "show_members":
            if not self.payload.members:
                raise ValueError("payload.members is required for show_members")
        elif self.contribution_type == "show_info":
            p = self.payload
            if not any([p.setlist_name, p.show_date, p.show_time]):
                raise ValueError("at least one of setlist_name, show_date, show_time is required for show_info")
        return self


@router.post("/")
async def submit_contribution(
    body: ContributionSubmit,
    service: ContributionService = Depends(),
):
    data = body.model_dump()
    data["payload"] = body.payload.model_dump(exclude_none=True)
    return service.submit(data)
