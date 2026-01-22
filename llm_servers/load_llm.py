# lifespan_manager.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import torch
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局变量存储模型和tokenizer
model = None
tokenizer = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    管理应用生命周期的函数，负责模型的加载和释放
    """
    # 启动时加载模型
    global model, tokenizer
    
    try:
        logger.info("Loading model...")
        # 假设settings是从其他模块导入的
        from config import settings
        llm_path = settings.LLM_PATH
        device = "cuda:0" if torch.cuda.is_available() else "cpu"
        
        # 加载Qwen3模型
        tokenizer = AutoTokenizer.from_pretrained(llm_path)
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16
        )
        model = AutoModelForCausalLM.from_pretrained(
            llm_path,
            quantization_config=quantization_config,
            device_map="auto",
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            dtype=torch.float16
        ).to(device)
        model_name = llm_path.split("/")[-1]
        logger.info(f"Loaded model {model_name} on {device}")

        # TODO：TTS模型加载
        
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise
    
    yield  # 应用运行期间
    
    # 关闭时释放资源
    try:
        logger.info("Unloading model...")
        del model
        del tokenizer
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Model unloaded successfully")
    except Exception as e:
        logger.error(f"Error during model unloading: {str(e)}")

def get_model():
    """获取模型实例的函数"""
    return model

def get_tokenizer():
    """获取tokenizer实例的函数"""
    return tokenizer
