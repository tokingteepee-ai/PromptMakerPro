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
    idea: str

@app.get("/")
async def read_root():
    return {"status": "ok", "message": "PromptMakerPro backend is running."}

@app.post("/generate")
async def generate_prompt(payload: GenerateRequest):
    idea = payload.idea.strip()
    if not idea:
        return {"prompt": "Please provide an idea to generate a prompt."}
    generated = f"Write a detailed, high-quality prompt that helps someone explore the following idea in depth: '{idea}'. Make the prompt clear, specific, and actionable."
    return {"prompt": generated}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
