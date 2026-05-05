build:
	docker compose -f local/docker-compose.yaml build

up:
	docker compose -f local/docker-compose.yaml up -d

down:
	docker compose -f local/docker-compose.yaml down

logs:
	docker compose -f local/docker-compose.yaml logs -f backend

migrate:
	docker compose -f local/docker-compose.yaml run --rm backend-db-migrate

sync-members:
	docker compose -f local/docker-compose.yaml --profile sync run --rm tool-member-sync
