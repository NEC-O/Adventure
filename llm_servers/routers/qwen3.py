import uuid
from typing import Optional, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, BackgroundTasks
from schemas.qwen3 import GenerateRequest
from core.qwen3 import LLMQwen
from schemas.qwen3 import GenerateResponse

router = APIRouter(
    prefix="/qwen3",
    tags=["qwen3"]
)

def get_session_id(session_id: Optional[str] = Cookie(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    return session_id


@router.post("/generate", response_model=GenerateResponse)
async def generate_text(
    resquest:GenerateRequest,
    response: Response,
    session_id: str = Depends(get_session_id),
):
    response.set_cookie(key="session_id", value=session_id, httponly=True)
    print(f"Request:{resquest}")
    prompt = resquest.prompt.split(':')[-1]
    print(f"Prompt:{prompt}")


    result = LLMQwen.generate_response(prompt)


    return result
