import asyncio
import logging

from sqlmodel import select, Session
from database import engine
from models import Job, Thumbnail
from services.openai_service import generate_thumbnails
from services.imagekit_service import upload_file, get_variants

logger = logging.getLogger(__name__)


STYLE_PROMPTS = {
#here i want to write the three style prompts bold, realistic, minimalistic write the descriptive prompts for each style
    "bold": "Create a bold and dramatic thumbnail with a strong focal point and high contrast.",
    "realistic": "Create a realistic and natural thumbnail with a focus on detail and realism.",
    "minimalistic": "Create a minimalistic and clean thumbnail with a focus on simplicity and minimalism.",
}

STYLE_PROMPTS_ORDER = ["bold", "realistic", "minimalistic"]


async def generate_single_thumbnail(thumbnail_id:str,prompt:str,headshot_url:str):
    #DB mark
    with Session(engine) as session:
        thumb = session.get(Thumbnail, thumbnail_id)
        thumb.status = "generating"
        style_name = thumb.style_name
        session.add(thumb)
        session.commit()

    style_prompt = STYLE_PROMPTS[style_name]

    #ai call
    try:
        image_bytes = await generate_thumbnails(prompt,style_prompt,headshot_url)
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            job_id = thumb.job_id
        #upload to imagekit
        url = upload_file(file_bytes=image_bytes,file_name=f"{thumbnail_id}.png",folder="thumbnails")
        #db call save url + mark upload 
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            thumb.imagekit_url = url
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()
        logger.info(f"Thumbnail {thumbnail_id} generated and uploaded to ImageKit")
    
    except Exception as e:
        logger.error(f"Error generating thumbnail {thumbnail_id}: {e}")
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            thumb.status = "failed"
            thumb.error_message = str(e)[:255]
            session.add(thumb)
            session.commit()
        raise

async def process_job(job_id:str):
    # mark job as processing
    #find all thumbnails for the job
    # start one worker for each thumbnail
    # wait for all workers to complete
    # mark job as completed / failed
    with Session(engine) as session:
        job = session.get(Job, job_id)
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        thumbnail_ids = [thumbnail.id for thumbnail in thumbnails]

        task = [
            generate_single_thumbnail(tid,prompt,headshot_url)
            for tid in thumbnail_ids
        ]

        await asyncio.gather(*task,return_exceptions=True)


        with Session(engine) as session:
            thumbnails = session.exec(select(Thumbnail).where(Thumbnail.job_id==job_id)).all()
            all_failed = all(t.status == "failed" for t in thumbnails)
            job = session.get(Job, job_id)
            job.status = "failed" if all_failed else "completed"
            session.add(job)
            session.commit()


    