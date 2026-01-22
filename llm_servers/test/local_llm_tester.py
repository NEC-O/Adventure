from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

# from core.prompts import STORY_PROMPT, json_structure


@dataclass
class GenerationSettings:
    """Generation hyper-parameters used during local verification."""

    max_new_tokens: int = 2048
    temperature: float = 0.8
    top_p: float = 0.9
    top_k: int = 40
    do_sample: bool = True


class LocalLLMTester:
    """
    Utility class that loads the locally fine-tuned Qwen3 model via transformers
    and produces sample generations. Useful for validating LoRA updates without
   启动完整的 FastAPI 服务。
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        checkpoint_path: Optional[str] = None,
        device: Optional[str] = None,
        dtype: torch.dtype = torch.float16,
    ) -> None:
        self.model_path = model_path
        self.device = device or ("cuda:0" if torch.cuda.is_available() else "cpu")

        self.tokenizer = AutoTokenizer.from_pretrained(self.model_path, trust_remote_code=True)
        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_path,
            dtype=dtype,
            device_map="auto" if self.device.startswith("cuda") else None,
            trust_remote_code=True,
        )
        self.model = PeftModel.from_pretrained(self.model, checkpoint_path)
        self.model.to(self.device)
        self.generation_settings = GenerationSettings()

    def _build_messages(self, prompt: str) -> List[Dict[str, str]]:
        return [
            {
                "role": "system",
                # "content": STORY_PROMPT.format(format_instruction=json_structure),
                "content": "As the author's assistant, please continue the story.",
            },
            {"role": "user", "content": prompt},
        ]

    def generate(self, user_prompt: str, gen_settings: Optional[GenerationSettings] = None) -> Dict[str, Any]:
        """Generate text for a given prompt and return metadata for inspection."""
        settings_to_use = gen_settings or self.generation_settings
        messages = self._build_messages(user_prompt)

        chat_prompt = self.tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=False,
        )

        model_inputs = self.tokenizer(
            chat_prompt,
            return_tensors="pt",
        ).to(self.model.device)

        with torch.no_grad():
            output_ids = self.model.generate(
                **model_inputs,
                max_new_tokens=settings_to_use.max_new_tokens,
                temperature=settings_to_use.temperature,
                top_p=settings_to_use.top_p,
                top_k=settings_to_use.top_k,
                do_sample=settings_to_use.do_sample,
            )[0]

        generated_ids = output_ids[model_inputs["input_ids"].shape[-1] :]
        generated_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True).strip()

        return {
            "prompt": user_prompt,
            "generation_settings": asdict(settings_to_use),
            "output": generated_text,
        }


def run_sample(model_path: str, checkpoint_path: str, theme: str = "cyberpunk mystery") -> Dict[str, Any]:
    """
    Convenience helper to instantiate the tester and return one sample generation.
    """
    tester = LocalLLMTester(model_path, checkpoint_path)
    prompt = f"{theme}"
    return tester.generate(prompt)


if __name__ == "__main__":
    model_path = "D:/ImplEMenT/huggingface/hub/Qwen3-0.6B"
    checkpoint_path = "llm_servers/train/output/checkpoint-1000"
    theme = """负时间参数"的探讨在丁仪手中凝结成一盏不眠的星火，他望着窗外雨幕中的倒影，指尖轻点玻璃杯边缘："当物理学家的计算与现实发生共振时，或许能唤醒某些沉睡的规律。"

雨滴在玻璃上折射出的光晕突然变得流动，时间的涟漪在空气里荡漾。丁仪将手放在杯口，冰凉的液体映出他瞳孔深处的倒影——那里映照着自己 对科学的执着，也映着对未知的敬畏。物理学家手中的玻璃杯微微发烫，而他掌心的白瓷碎片却像星云般流转。

"你看到的光，是时间本身在等待。"他低语着，声音在雨中化作涟漪，"当人类试图用科学改变永恒时，是否也该先问：改变的代价是什么？"   

窗外的雨突然变得深沉，雨滴在玻璃上敲出低沉的节奏。丁仪转身时，雨丝中浮现出一位年轻科学家的轮廓，他正凝视着手中的玻璃杯，眼神中 带着对时间的某种释然。杯壁上凝结的水珠折射出的光，与窗外雨幕交织成某种奇异的和谐。

"或许，真正的科学不在于改变，而在于理解。"丁仪的目光穿过雨幕，在物理学家身上停留片刻，"当时间被引入现实，它或许会像潮水般消逝，但至少，人类的选择不会永远停滞。"""

    result = run_sample(model_path, checkpoint_path, theme)
    print("Prompt:", result["prompt"])
    print("Settings:", result["generation_settings"])
    print("Output:\n", result["output"])

