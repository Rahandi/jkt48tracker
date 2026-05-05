run:
	fastapi dev main.py

build:
	docker build -t jkt48tracker-backend:latest -f Dockerfile .

docker-run:
	docker run --rm -p 8000:8000 jkt48tracker-backend:1