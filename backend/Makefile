run:
	fastapi dev main.py

build:
	docker build -t test:1 -f Dockerfile .

docker-run:
	docker run --rm -p 8000:8000 test:1