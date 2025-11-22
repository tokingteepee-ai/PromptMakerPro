from typing import Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# Allow all origins for now (can be restricted later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question(BaseModel):
    key: str
    label: str

class GenerateRequest(BaseModel):
    mode: str = "start"     # "start" or "complete"
    idea: str
    answers: Optional[Dict[str, str]] = None  # filled only in "complete" mode


@app.get("/")
async def read_root():
    return {"status": "ok", "message": "PromptMakerPro backend is running with Prompt Template Q&A flow."}


@app.post("/generate")
async def generate_prompt(payload: GenerateRequest):
    mode = payload.mode.strip().lower()
    idea = payload.idea.strip()

    if not idea:
        return {
            "status": "error",
            "message": "Please provide an idea to start from."
        }

    # Phase 1: ask clarifying questions for the Prompt Template mode
    if mode == "start":
        questions: List[Dict[str, str]] = [
            {
                "key": "goal",
                "label": "What is the main goal of this prompt? (e.g., generate blog posts, write sales emails, plan video scripts)"
            },
            {
                "key": "audience",
                "label": "Who is the primary target audience? (role, industry, experience level)"
            },
            {
                "key": "industry",
                "label": "What industry or niche is this for? (e.g., AI, education, healthcare, marketing)"
            },
            {
                "key": "experience_level",
                "label": "What is the expected experience level of the audience? (Beginner, Intermediate, Advanced, Expert)"
            },
            {
                "key": "output_format",
                "label": "What output format should the AI produce? (e.g., email, LinkedIn post, YouTube script, bullet points, step-by-step plan)"
            },
            {
                "key": "output_length",
                "label": "What length should the output be? (Short, Medium, Long, Very Long, or word range)"
            },
            {
                "key": "tone_style",
                "label": "What tone or style should the AI use? (e.g., professional, casual, bold, humorous, authoritative)"
            },
            {
                "key": "content_to_avoid",
                "label": "What topics, phrases, or angles must be avoided? (e.g., politics, medical claims, strong opinions)"
            },
            {
                "key": "accuracy_level",
                "label": "How important is factual accuracy? (General, High, Critical)"
            },
            {
                "key": "seo_keywords",
                "label": "Add any important SEO keywords to include (comma-separated), or leave blank if not relevant."
            },
            {
                "key": "citations_required",
                "label": "Should the AI include citations or sources? If yes, describe how (e.g., links, titles, inline references)."
            },
            {
                "key": "target_platforms",
                "label": "Which AI platforms or models will use this prompt? (e.g., Claude 3 Opus, GPT-5, etc.)"
            }
        ]
        return {
            "status": "need_more_info",
            "idea": idea,
            "questions": questions
        }

    # Phase 2: build a professional prompt from idea + answers
    if mode == "complete":
        answers = payload.answers or {}

        goal = answers.get("goal", "").strip()
        audience = answers.get("audience", "").strip()
        industry = answers.get("industry", "").strip()
        experience_level = answers.get("experience_level", "").strip()
        output_format = answers.get("output_format", "").strip()
        output_length = answers.get("output_length", "").strip()
        tone_style = answers.get("tone_style", "").strip()
        content_to_avoid = answers.get("content_to_avoid", "").strip()
        accuracy_level = answers.get("accuracy_level", "").strip()
        seo_keywords = answers.get("seo_keywords", "").strip()
        citations_required = answers.get("citations_required", "").strip()
        target_platforms = answers.get("target_platforms", "").strip()

        prompt_parts = [
            "You are an expert prompt engineer and copy strategist.",
            "Create a high-quality, reusable prompt for a large language model.",
            f"- Core idea: {idea}"
        ]

        if goal:
            prompt_parts.append(f"- Goal of the prompt: {goal}")
        if audience:
            prompt_parts.append(f"- Target audience: {audience}")
        if industry:
            prompt_parts.append(f"- Industry / niche: {industry}")
        if experience_level:
            prompt_parts.append(f"- Audience experience level: {experience_level}")
        if output_format:
            prompt_parts.append(f"- Desired output format: {output_format}")
        if output_length:
            prompt_parts.append(f"- Desired output length: {output_length}")
        if tone_style:
            prompt_parts.append(f"- Tone / style: {tone_style}")
        if content_to_avoid:
            prompt_parts.append(f"- Content to avoid: {content_to_avoid}")
        if accuracy_level:
            prompt_parts.append(f"- Accuracy level / fact-checking: {accuracy_level}")
        if seo_keywords:
            prompt_parts.append(f"- SEO keywords to naturally include: {seo_keywords}")
        if citations_required:
            prompt_parts.append(f"- Citation / source requirements: {citations_required}")
        if target_platforms:
            prompt_parts.append(f"- Target AI platforms / models: {target_platforms}")

        prompt_parts.append(
            "Write the final prompt as clear instructions to the AI system. "
            "Make it structured, explicit about constraints, and easy to reuse. "
            "Include any setup role or persona if helpful, and ensure the model knows to follow the tone, audience, and constraints carefully."
        )

        final_prompt = "\n".join(prompt_parts)

        return {
            "status": "done",
            "prompt": final_prompt
        }

    # Fallback for unknown mode
    return {
        "status": "error",
        "message": "Invalid mode. Use 'start' to begin or 'complete' to generate the final prompt."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
