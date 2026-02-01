import json
import os
import time
from typing import Dict, List, Optional

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_TTL_SECONDS = int(os.getenv("REDIS_TTL_SECONDS", "21600"))

STEP_ORDER = ["pm", "tech", "qa", "principal", "review"]
ARTIFACT_NAMES = ["prd", "arch", "api", "test", "risk", "stack", "review", "final"]


def get_redis() -> redis.Redis:
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


def _meta_key(run_id: str) -> str:
    return f"run:{run_id}:meta"


def _idea_key(run_id: str) -> str:
    return f"run:{run_id}:idea"


def _step_key(run_id: str) -> str:
    return f"run:{run_id}:steps"


def _artifact_key(run_id: str, name: str) -> str:
    return f"run:{run_id}:artifact:{name}"


def _events_key(run_id: str) -> str:
    return f"run:{run_id}:events"


def init_run(run_id: str, idea: str) -> None:
    r = get_redis()
    now = int(time.time())
    r.hset(_meta_key(run_id), mapping={"status": "queued", "created_at": now})
    r.set(_idea_key(run_id), idea)
    for step in STEP_ORDER:
        r.hset(_step_key(run_id), step, "pending")
    for key in (_meta_key(run_id), _idea_key(run_id), _step_key(run_id)):
        r.expire(key, REDIS_TTL_SECONDS)


def set_run_meta(run_id: str, values: Dict[str, str]) -> None:
    if not values:
        return
    r = get_redis()
    r.hset(_meta_key(run_id), mapping=values)
    r.expire(_meta_key(run_id), REDIS_TTL_SECONDS)


def get_run_meta(run_id: str) -> Dict[str, str]:
    r = get_redis()
    return r.hgetall(_meta_key(run_id)) or {}


def get_run_meta_value(run_id: str, key: str) -> Optional[str]:
    r = get_redis()
    return r.hget(_meta_key(run_id), key)


def run_exists(run_id: str) -> bool:
    r = get_redis()
    return r.exists(_meta_key(run_id)) == 1


def get_idea(run_id: str) -> Optional[str]:
    r = get_redis()
    return r.get(_idea_key(run_id))


def set_run_status(run_id: str, status: str) -> None:
    r = get_redis()
    r.hset(_meta_key(run_id), mapping={"status": status, "updated_at": int(time.time())})
    r.expire(_meta_key(run_id), REDIS_TTL_SECONDS)


def get_run_status(run_id: str) -> Optional[str]:
    r = get_redis()
    data = r.hget(_meta_key(run_id), "status")
    return data


def is_run_cancelled(run_id: str) -> bool:
    return get_run_status(run_id) == "cancelled"


def set_step_status(run_id: str, step: str, status: str) -> None:
    r = get_redis()
    r.hset(_step_key(run_id), step, status)
    r.expire(_step_key(run_id), REDIS_TTL_SECONDS)


def get_step_statuses(run_id: str) -> Dict[str, str]:
    r = get_redis()
    raw = r.hgetall(_step_key(run_id))
    return raw or {}


def set_artifact(run_id: str, name: str, content: str) -> None:
    r = get_redis()
    r.set(_artifact_key(run_id, name), content, ex=REDIS_TTL_SECONDS)


def get_artifact(run_id: str, name: str) -> Optional[str]:
    r = get_redis()
    return r.get(_artifact_key(run_id, name))


def list_artifacts(run_id: str) -> Dict[str, bool]:
    r = get_redis()
    present: Dict[str, bool] = {}
    for name in ARTIFACT_NAMES:
        present[name] = r.exists(_artifact_key(run_id, name)) == 1
    return present


def clear_artifacts(run_id: str, names: List[str]) -> None:
    if not names:
        return
    r = get_redis()
    keys = [_artifact_key(run_id, name) for name in names]
    r.delete(*keys)


def append_event(run_id: str, event: Dict[str, str]) -> None:
    r = get_redis()
    r.rpush(_events_key(run_id), json.dumps(event))
    r.expire(_events_key(run_id), REDIS_TTL_SECONDS)


def get_events(run_id: str, start: int = 0) -> List[str]:
    r = get_redis()
    return r.lrange(_events_key(run_id), start, -1)
