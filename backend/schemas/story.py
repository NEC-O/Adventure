from typing import List, Optional, Tuple, Union, Dict
from datetime import datetime
from pydantic import BaseModel


class StoryOptionsSchema(BaseModel):
    text: str
    node_id: Optional[int] = None


class StoryNodeBase(BaseModel):
    content: str
    is_ending: bool = False
    is_winning_ending: bool = False


class CompleteStoryNodeResponse(StoryNodeBase):
    id: int
    options: List[StoryOptionsSchema] = []

    class Config:
        from_attributes = True


class StoryBase(BaseModel):
    title: str
    session_id: Optional[str] = None

    class Config:
        from_attributes = True


class CreateStoryRequest(BaseModel):
    theme: str


class StoryListItem(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    status: str
    node_count: int = 0

    class Config:
        from_attributes = True


class StoryListResponse(BaseModel):
    stories: List[StoryListItem]
    total: int

    class Config:
        from_attributes = True


class StoryUpdateRequest(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None


class StoryNodeCreateRequest(BaseModel):
    content: str
    parent_node_id: Optional[int] = None
    is_ending: bool = False
    is_winning_ending: bool = False
    options: List[StoryOptionsSchema] = []


class StoryNodeUpdateRequest(BaseModel):
    content: Optional[str] = None
    is_ending: Optional[bool] = None
    is_winning_ending: Optional[bool] = None
    options: Optional[List[StoryOptionsSchema]] = None


class CompleteStoryResponse(StoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    status: str
    root_node: CompleteStoryNodeResponse
    all_nodes: Dict[int, CompleteStoryNodeResponse]

    class Config:
        from_attributes = True
