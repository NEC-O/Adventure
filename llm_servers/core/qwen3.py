from core.prompts import STORY_PROMPT, json_structure
from schemas.qwen3 import GenerateResponse
from load_llm import get_model, get_tokenizer

# from dotenv import load_dotenv
# load_dotenv()


class LLMQwen:

    @classmethod
    def _get_llm(cls):
        return get_model(), get_tokenizer()
    
    @classmethod
    def generate_response(cls, prompt: str) -> GenerateResponse:
        model, tokenizer = cls._get_llm()
        if prompt:
            messages = [
                {"role": "system", "content": STORY_PROMPT.format(format_instruction=json_structure)},
                {"role": "user", "content": prompt},
            ]

        text = tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=False,
            enable_thinking=False,
            Temperature=0.7,
            Top=0.8,
            TopK=20,
            MinP=0,
        )

        model_inputs = tokenizer(text, return_tensors="pt").to(model.device)

        outputs = model.generate(
            **model_inputs,
            max_new_tokens=32768)
        
        output_ids = outputs[0][len(model_inputs.input_ids[0]):].tolist()

        try:
            # rindex finding 151668 (</think>)
            index = len(output_ids) - output_ids[::-1].index(151668)
        except ValueError:
            index = 0

        thinking_content = tokenizer.decode(output_ids[:index], skip_special_tokens=True).strip("\n")
        answer = tokenizer.decode(output_ids[index:], skip_special_tokens=True).strip("\n")

        return GenerateResponse(thinking_content=thinking_content, answer=answer)
