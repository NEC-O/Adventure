from typing import List
from pydantic_settings import BaseSettings
# from pydantic import field_validator


class Settings(BaseSettings):
    API_PREFIX: str = "/api"
    DEBUG: bool = False

    LLM_PATH: str
    TTS_PATH: str
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
    

settings = Settings()