import logging

from dotenv import load_dotenv
from fastapi import FastAPI

from routes.routes import router

load_dotenv()

logging.getLogger("uvicorn.error").setLevel(logging.DEBUG)
logging.getLogger("uvicorn.access").setLevel(logging.DEBUG)
logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

app = FastAPI(
  debug=True,
)
app.include_router(router)

@app.get("/healthcheck")
async def healthcheck():
  return {"status": "ok"}