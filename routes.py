import asyncio
import logging
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.auth import get_current_user
from app.db.session import get_session
from app.models import Job, Thumbnail, User

from services.generator import process_job, STYLE_PROMPTS_ORDER
from services.imagekit_service import upload_file, get_variants


logger = logging.getLogger(__name__)


router = APIRouter(prefix="/api/v1", tags=["thumbnail"])

## Request Response Schema


class CreateJobRequest(BaseModel):
    prompt: str
    num_thumbnails: int
    headshot_url: str


class CreateJobResponse(BaseModel):
    job_id: str


class ThumbnailResponse(BaseModel):
    id: str
    style_name: str
    status: str
    imagekit_url: str
    error_message: str
    variants: Optional[dict]


class JobResponse(BaseModel):
    id: str
    prompt: str
    num_thumbnails: int
    headshot_url: str
    status: str
    thumbnails: List[ThumbnailResponse]


@router.post("/upload-headshot")
async def upload_headshot(
    file: UploadFile = File(...),
    _current_user: User = Depends(get_current_user),
):
    content = await file.read()
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image/"):
        content_type = "image/png"
    url = upload_file(
        file_bytes=content,
        file_name=file.filename,
        folder="headshots",
        content_type=content_type,
    )
    return {"url": url}


@router.post("/jobs", response_model=CreateJobResponse)
async def create_job(
    request: CreateJobRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if request.num_thumbnails < 1 or request.num_thumbnails > 3:
        raise HTTPException(
            status_code=400, detail="Number of thumbnails must be between 1 and 3"
        )

    job = Job(
        user_id=current_user.id,
        prompt=request.prompt,
        num_thumbnails=request.num_thumbnails,
        headshot_url=request.headshot_url,
    )
    session.add(job)

    styles = STYLE_PROMPTS_ORDER[: request.num_thumbnails]
    for style in styles:
        thumbnail = Thumbnail(job_id=job.id, style_name=style)
        session.add(thumbnail)
    session.commit()

    # async background task to process the job
    asyncio.create_task(process_job(job.id))
    return CreateJobResponse(job_id=job.id)


@router.get("/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    job = session.get(Job, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id == job_id)).all()
    thumbnail_response = []
    for thumbnail in thumbnails:
        variants = (
            get_variants(thumbnail.imagekit_url) if thumbnail.imagekit_url else None
        )
        thumbnail_response.append(
            ThumbnailResponse(
                id=thumbnail.id,
                style_name=thumbnail.style_name,
                status=thumbnail.status,
                imagekit_url=thumbnail.imagekit_url,
                error_message=thumbnail.error_message,
                variants=variants,
            )
        )

    return JobResponse(
        id=job.id,
        prompt=job.prompt,
        num_thumbnails=job.num_thumbnails,
        headshot_url=job.headshot_url,
        status=job.status,
        thumbnails=thumbnail_response,
    )


@router.get("/jobs/{job_id}/stream")
async def stream_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Server-sent events for thumbnail and job completion status."""
    job = session.get(Job, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        from database import engine

        sent_thumbnails: set[str] = set()

        while True:
            with Session(engine) as session:
                job = session.get(Job, job_id)
                if not job or job.user_id != current_user.id:
                    yield (
                        "event: stream_error\ndata: "
                        + json.dumps({"error": "Job not found"})
                        + "\n\n"
                    )
                    return

                thumbnails = session.exec(
                    select(Thumbnail).where(Thumbnail.job_id == job_id)
                ).all()

                for t in thumbnails:
                    if t.id in sent_thumbnails:
                        continue
                    if t.status == "uploaded":
                        variants = (
                            get_variants(t.imagekit_url) if t.imagekit_url else None
                        )
                        data = json.dumps(
                            {
                                "thumbnail_id": t.id,
                                "style_name": t.style_name,
                                "imagekit_url": t.imagekit_url,
                                "variants": variants,
                            }
                        )
                        yield f"event: thumbnail_ready\ndata: {data}\n\n"
                        sent_thumbnails.add(t.id)
                    elif t.status == "failed":
                        data = json.dumps(
                            {
                                "thumbnail_id": t.id,
                                "style_name": t.style_name,
                                "error_message": t.error_message,
                            }
                        )
                        yield f"event: thumbnail_failed\ndata: {data}\n\n"
                        sent_thumbnails.add(t.id)

                all_done = all(
                    t.status in ("uploaded", "failed") for t in thumbnails
                )
                if (
                    all_done
                    and len(thumbnails) > 0
                    and len(sent_thumbnails) == len(thumbnails)
                ):
                    data = json.dumps({"job_id": job_id, "status": "completed"})
                    yield f"event: job_completed\ndata: {data}\n\n"
                    return

            await asyncio.sleep(1.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
