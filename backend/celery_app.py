import os
from celery import Celery

broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery = Celery(
    "socioboard_tasks",
    broker=broker_url,
    backend=result_backend,
)

@celery.task(name="dummy_task")
def dummy_task():
    return "Dummy task completed!"
