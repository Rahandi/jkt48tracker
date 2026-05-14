import os

from dotenv import load_dotenv
from fastapi import FastAPI
from routes.routes import router
from routes.internal.routes import router as internal_router

load_dotenv()

app = FastAPI(debug=os.getenv("DEBUG", "false").lower() == "true")
app.include_router(router)
app.include_router(internal_router)

@app.get("/healthcheck")
async def healthcheck():
  return {"status": "ok"}