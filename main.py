from fastapi import FastAPI
import uvicorn, os

app = FastAPI()

@app.get("/")
def home():
    return {"message": "PromptMakerPro backend server is running!"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)

