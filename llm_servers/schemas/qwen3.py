from pydantic import BaseModel


class GenerateResponse(BaseModel):
    thinking_content: str
    answer: str

class GenerateRequest(BaseModel):
    prompt: str


