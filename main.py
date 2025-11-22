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

class GenerateRequest(BaseModel):
    mode: str = "start"     # "start" or "complete"
    idea: str
    answers: Optional[Dict[str, str]] = None  # filled only in "complete" mode


@app.get("/")
async def read_root():
    return {"status": "ok", "message": "PromptMakerPro backend is running with Q&A flow."}


@app.post("/generate")
async def generate_prompt(payload: GenerateRequest):
    mode = payload.mode.strip().lower()
    idea = payload.idea.strip()

    if not idea:
        return {
            "status": "error",
            "message": "Please provide an idea to start from."
        }

    # Phase 1: ask clarifying questions
    if mode == "start":
        questions: List[str] = [
            "Who is the main audience for this?",
            "What is the main outcome you want? (e.g., book calls, get replies, educate, entertain)",
            "What format should the output be? (e.g., LinkedIn post, sales email, YouTube script, landing page)",
            "What tone or voice should it have? (e.g., professional, casual, humorous, bold)",
            "Are there any must-include details, offers, or links?",
            "Are there any topics, phrases, or claims that must be avoided?",
            "Roughly how long or detailed should the output be?"
        ]
        return {
            "status": "need_more_info",
            "idea": idea,
            "questions": questions
        }

    # Phase 2: build a professional prompt from idea + answers
    if mode == "complete":
        answers = payload.answers or {}

        audience = answers.get("audience", "").strip()
        outcome = answers.get("outcome", "").strip()
        fmt = answers.get("format", "").strip()
        tone = answers.get("tone", "").strip()
        must_include = answers.get("must_include", "").strip()
        must_avoid = answers.get("must_avoid", "").strip()
        length = answers.get("length", "").strip()

        prompt_parts = [
            "You are an expert copywriter and strategist.",
            f"Create a {fmt or 'piece of content'} based on the following idea:",
            f"- Core idea: {idea}"
        ]

        if audience:
            prompt_parts.append(f"- Target audience: {audience}")
        if outcome:
            prompt_parts.append(f"- Primary goal/outcome: {outcome}")
        if tone:
            prompt_parts.append(f"- Tone/voice: {tone}")
        if must_include:
            prompt_parts.append(f"- Must include: {must_include}")
        if must_avoid:
            prompt_parts.append(f"- Avoid: {must_avoid}")
        if length:
            prompt_parts.append(f"- Length/detail level: {length}")

        prompt_parts.append(
            "Structure the response clearly, with strong hooks, logical flow, and a clear call to action if appropriate."
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
