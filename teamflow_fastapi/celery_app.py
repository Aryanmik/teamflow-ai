from celery import Celery

from .storage import REDIS_URL

celery_app = Celery(
    "teamflow_fastapi",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["teamflow_fastapi.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)
