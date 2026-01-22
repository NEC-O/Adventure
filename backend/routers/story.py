import uuid
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Cookie, Response, BackgroundTasks
from sqlalchemy.orm import Session

from db.database import get_db, SessionLocal
from models.story import Story, StoryNode
from models.job import StoryJob
from schemas.story import (
    CompleteStoryResponse, CompleteStoryNodeResponse, CreateStoryRequest
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


@router.get("/{story_id}/complete", response_model=CompleteStoryResponse)
def get_complete_story(story_id: int, db: Session = Depends(get_db)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    # TODO： 解析故事文本
    complete_story = build_complete_story_tree(db, story)
    return complete_story


@router.get("/list", response_model=list[CompleteStoryResponse])
def get_story_list(
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    stories = db.query(Story).filter(Story.session_id == session_id).order_by(Story.created_at.desc()).all()
    story_list = []
    for story in stories:
        try:
            complete_story = build_complete_story_tree(db, story)
            story_list.append(complete_story)
        except Exception as e:
            print(f"Error building story {story.id}: {e}")
    return story_list


@router.delete("/{story_id}")
def delete_story(
    story_id: int,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id, Story.session_id == session_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    db.query(StoryNode).filter(StoryNode.story_id == story_id).delete()
    db.delete(story)
    db.commit()
    
    return {"message": "Story deleted successfully"}


@router.put("/{story_id}/nodes/{node_id}")
def update_story_node(
    story_id: int,
    node_id: int,
    content: str,
    options: Optional[list] = None,
    is_ending: Optional[bool] = None,
    is_winning_ending: Optional[bool] = None,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id, Story.session_id == session_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    node = db.query(StoryNode).filter(StoryNode.id == node_id, StoryNode.story_id == story_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Story node not found")
    
    node.content = content
    if options is not None:
        node.options = options
    if is_ending is not None:
        node.is_ending = is_ending
    if is_winning_ending is not None:
        node.is_winning_ending = is_winning_ending
    
    db.commit()
    
    return {"message": "Story node updated successfully"}


@router.post("/{story_id}/nodes")
def create_story_node(
    story_id: int,
    content: str,
    is_ending: Optional[bool] = False,
    is_winning_ending: Optional[bool] = False,
    session_id: str = Depends(get_session_id),
    db: Session = Depends(get_db)
):
    story = db.query(Story).filter(Story.id == story_id, Story.session_id == session_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    new_node = StoryNode(
        story_id=story_id,
        content=content,
        is_ending=is_ending,
        is_winning_ending=is_winning_ending,
        options=[]
    )
    
    db.add(new_node)
    db.commit()
    
    return {"message": "Story node created successfully", "node_id": new_node.id}


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
        root_node=node_dict[root_node.id],
        all_nodes=node_dict
    )
