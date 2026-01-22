from sqlalchemy.orm import Session
from langchain_core.language_models import LLM
from langchain_core.callbacks import CallbackManagerForLLMRun
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from core.prompts import STORY_PROMPT
from models.story import Story, StoryNode
from core.models import StoryNodeLLM, StoryLLMResponse, StoryLLMRequest
from typing import Any, Dict, List, Optional
import requests
import json

from dotenv import load_dotenv
load_dotenv()


# 定义服务A的URL
SERVICE_A_URL = "http://localhost:8001/api/qwen3/generate"

class RemoteLLM(LLM):

    service_url: str

    def _llm_type(self) -> str:
        return "remote_llm"

    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> str:
        try:
            messages = {"prompt": prompt}

            response = requests.post(self.service_url, json=messages)
            # print(f"LLM---1{ StoryLLMRequest(**response.json())}")
            if response.status_code == 200:
                response = StoryLLMRequest(**response.json(), esure_ascii=False)

                return response.model_dump_json()
            else:
                raise Exception(f"Error calling LLM service: {response.status_code}")
        except Exception as e:
            raise Exception(f"Error calling LLM service: {str(e)}")
        
class CustomLLM:
    def __init__(self, service_url):
        self.service_url = service_url

    def __call__(self, prompt: str) -> str:
        response = requests.post(self.service_url, json={"prompt": prompt})
        print(f"LLM---2{response.json()}")
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Error calling LLM service: {response.status_code}")




class StoryGenerator:
    # custom_llm = CustomLLM(SERVICE_A_URL)

    @classmethod
    def _get_llm(cls) -> RemoteLLM:
        # 初始化自定义LLM
        
        return RemoteLLM(service_url=SERVICE_A_URL)
    
    @classmethod
    def generate_story(cls, db: Session, session_id: str, theme: str = "fantasy") -> Story:
        llm = cls._get_llm()
        story_parser = PydanticOutputParser(pydantic_object=StoryLLMResponse)
        resquest_parser = PydanticOutputParser(pydantic_object=StoryLLMRequest)
        # prompt = ChatPromptTemplate.from_messages([
        #     (
        #         "system",
        #         STORY_PROMPT
        #     ),
        #     (
        #         "human",
        #         f"Generate a story with the theme: {theme}"
        #     )
        # ]).partial(from_instructions=story_parser.get_format_instructions())
        # prompt = f"Generate a story with the theme: {theme}"
        prompt = ChatPromptTemplate.from_messages([
            (
                "human",
                f"Generate a story with the theme: {theme}"
            )
        ])
        print("LLM")
        chain = (
            {"theme": RunnablePassthrough(),
             "format_instructions": lambda _: story_parser.get_format_instructions()
            }
            | prompt
            | llm
            | resquest_parser)
        raw_response = chain.invoke(prompt)

        response_text = raw_response
        if hasattr(raw_response, "answer"):
            response_text = raw_response.answer

        story_structure = story_parser.parse(response_text)
        print(story_parser)

        story_db = Story(title=story_structure.title, session_id=session_id)
        db.add(story_db)
        db.flush()

        root_node_data = story_structure.rootNode
        if isinstance(root_node_data, dict):
            root_node_data = StoryNodeLLM.model_validate(root_node_data)

        cls._process_story_node(db, story_db.id, root_node_data, is_root=True)

        db.commit()
        return story_db
    

    @classmethod
    def _process_story_node(cls, db: Session, story_id: int, node_data: StoryNodeLLM, is_root: bool = False) -> StoryNode:
        node = StoryNode(
            story_id=story_id,
            content=node_data.content if hasattr(node_data, "content") else node_data["content"],
            is_root=is_root,
            is_ending=node_data.isEnding if hasattr(node_data, "isEnding") else node_data["isEnding"],
            is_winning_ending=node_data.isWinningEnding if hasattr(node_data, "isWinningEnding") else node_data["isWinningEnding"],
            options=[]
        )
        db.add(node)
        db.flush()

        if not node.is_ending and (hasattr(node_data, "options") and node_data.options):
            options_list = []
            for option_data in node_data.options:
                next_node = option_data.nextNode

                if isinstance(next_node, dict):
                    next_node = StoryNodeLLM.model_validate(next_node)

                child_node = cls._process_story_node(db, story_id, next_node, False)

                options_list.append({
                    "text": option_data.text,
                    "node_id": child_node.id
                })

            node.options = options_list

        db.flush()
        return node