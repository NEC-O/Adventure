import uuid
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from db.database import get_db, SessionLocal
from models.story import Story, StoryNode
from models.job import StoryJob
from schemas.story import (
    CompleteStoryResponse, CompleteStoryNodeResponse, CreateStoryRequest,
    StoryListResponse, StoryListItem, StoryUpdateRequest,
    StoryNodeCreateRequest, StoryNodeUpdateRequest
)
from schemas.job import StoryJobResponse
from core.story_generator import StoryGenerator

router = APIRouter(
    prefix="/stories",
    tags=["stories"]
)

def get_session_id(session_id: Optional[str] = Cookie(None)):
    if not session_id:
        session_id = str(uuid.uuid4())
    return session_id


@router.post("/create", response_model=StoryJobResponse)
def create_story(
    resquest: CreateStoryRequest,
    background_tasks: BackgroundTasks,
    response: Response,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    response.set_cookie(key="session_id", value=session_id, httponly=True)

    job_id = str(uuid.uuid4())

    job = StoryJob(
        job_id=job_id,
        session_id=session_id,
        theme=resquest.theme,
        status="pending"
    )

    db.add(job)
    db.commit()

    background_tasks.add_task(
        generate_story_task,
        job_id=job_id,
        theme=resquest.theme,
        session_id=session_id
    )


    return job


def generate_story_task(job_id: str, theme: str, session_id: str):
    db = SessionLocal()

    try:
        job = db.query(StoryJob).filter(StoryJob.job_id == job_id).first()

        if not job:
            return
        
        try:
            job.status = "processing"
            db.commit()

            story = StoryGenerator.generate_story(db, session_id, theme)

            job.story_id = story.id
            job.status = "completed"
            job.completed_at = datetime.now()
            db.commit()
        except Exception as e:
            job.status = "failed"
            job.completed_at = datetime.now()
            job.error = str(e)
            db.commit()
    finally:
        db.close()


@router.get("/", response_model=StoryListResponse)
def get_stories(
    session_id: str = Depends(get_session_id),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    stories_query = db.query(Story).filter(Story.session_id == session_id)
    total = stories_query.count()
    stories = stories_query.offset(skip).limit(limit).all()
    
    story_items = []
    for story in stories:
        node_count = db.query(StoryNode).filter(StoryNode.story_id == story.id).count()
        story_items.append(StoryListItem(
            id=story.id,
            title=story.title,
            created_at=story.created_at,
            updated_at=story.updated_at,
            status=story.status,
            node_count=node_count
        ))
    
    return StoryListResponse(stories=story_items, total=total)


@router.get("/{story_id}", response_model=CompleteStoryResponse)
def get_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    complete_story = build_complete_story_tree(db, story)
    return complete_story


@router.get("/{story_id}/complete", response_model=CompleteStoryResponse)
def get_complete_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    complete_story = build_complete_story_tree(db, story)
    return complete_story


@router.put("/{story_id}", response_model=CompleteStoryResponse)
def update_story(
    story_id: int,
    story_update: StoryUpdateRequest,
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story_update.title is not None:
        story.title = story_update.title
    if story_update.status is not None:
        story.status = story_update.status
    
    db.commit()
    db.refresh(story)
    
    complete_story = build_complete_story_tree(db, story)
    return complete_story


@router.delete("/{story_id}")
def delete_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # 删除相关的所有节点
    db.query(StoryNode).filter(StoryNode.story_id == story_id).delete()
    
    # 删除故事
    db.delete(story)
    db.commit()
    
    return {"message": "Story deleted successfully"}


# 故事节点管理API
@router.post("/{story_id}/nodes", response_model=CompleteStoryNodeResponse)
def create_story_node(
    story_id: int,
    node_request: StoryNodeCreateRequest,
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # 创建新节点
    new_node = StoryNode(
        story_id=story_id,
        content=node_request.content,
        is_ending=node_request.is_ending,
        is_winning_ending=node_request.is_winning_ending,
        options=[option.dict() for option in node_request.options]
    )
    
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    
    # 如果有父节点，更新父节点的选项
    if node_request.parent_node_id:
        parent_node = db.query(StoryNode).filter(
            StoryNode.id == node_request.parent_node_id,
            StoryNode.story_id == story_id
        ).first()
        
        if parent_node:
            parent_options = parent_node.options or []
            parent_options.append({
                "text": f"Continue to node {new_node.id}",
                "node_id": new_node.id
            })
            parent_node.options = parent_options
            db.commit()
    
    return CompleteStoryNodeResponse(
        id=new_node.id,
        content=new_node.content,
        is_ending=new_node.is_ending,
        is_winning_ending=new_node.is_winning_ending,
        options=[StoryOptionsSchema(**opt) for opt in new_node.options]
    )


@router.put("/{story_id}/nodes/{node_id}", response_model=CompleteStoryNodeResponse)
def update_story_node(
    story_id: int,
    node_id: int,
    node_update: StoryNodeUpdateRequest,
    db: Session = Depends(get_db)
):
    node = db.query(StoryNode).filter(
        StoryNode.id == node_id,
        StoryNode.story_id == story_id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Story node not found")
    
    if node_update.content is not None:
        node.content = node_update.content
    if node_update.is_ending is not None:
        node.is_ending = node_update.is_ending
    if node_update.is_winning_ending is not None:
        node.is_winning_ending = node_update.is_winning_ending
    if node_update.options is not None:
        node.options = [option.dict() for option in node_update.options]
    
    db.commit()
    db.refresh(node)
    
    return CompleteStoryNodeResponse(
        id=node.id,
        content=node.content,
        is_ending=node.is_ending,
        is_winning_ending=node.is_winning_ending,
        options=[StoryOptionsSchema(**opt) for opt in node.options]
    )


@router.delete("/{story_id}/nodes/{node_id}")
def delete_story_node(story_id: int, node_id: int, db: Session = Depends(get_db)):
    node = db.query(StoryNode).filter(
        StoryNode.id == node_id,
        StoryNode.story_id == story_id
    ).first()
    
    if not node:
        raise HTTPException(status_code=404, detail="Story node not found")
    
    # 删除对其他节点的引用
    other_nodes = db.query(StoryNode).filter(StoryNode.story_id == story_id).all()
    for other_node in other_nodes:
        if other_node.options:
            updated_options = [
                opt for opt in other_node.options 
                if opt.get("node_id") != node_id
            ]
            if len(updated_options) != len(other_node.options):
                other_node.options = updated_options
                db.commit()
    
    db.delete(node)
    db.commit()
    
    return {"message": "Story node deleted successfully"}


def build_complete_story_tree(db: Session, story: Story) -> CompleteStoryResponse:
    nodes = db.query(StoryNode).filter(StoryNode.story_id == story.id).all()

    node_dict = {}
    for node in nodes:
        node_response = CompleteStoryNodeResponse(
            id=node.id,
            content=node.content,
            is_ending=node.is_ending,
            is_winning_ending=node.is_winning_ending,
            options=node.options
        )
        node_dict[node.id] = node_response

    root_node = next((node for node in nodes if node.is_root), None)

    if not root_node:
        raise HTTPException(status_code=500, detail="Story root node not found")
    
    return CompleteStoryResponse(
        id=story.id,
        title=story.title,
        session_id=story.session_id,
        created_at=story.created_at,
        updated_at=story.updated_at,
        status=story.status,
        root_node=node_dict[root_node.id],
        all_nodes=node_dict
    )
