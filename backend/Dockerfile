FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN --mount=type=cache,id=pip-cache,target=/root/.cache/pip \
    pip install -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1

RUN chmod +x start.sh
CMD ["sh", "start.sh"]
