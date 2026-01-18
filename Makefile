up:
	docker compose -f local/docker-compose.yaml up --force-recreate

down:
	docker compose -f local/docker-compose.yaml down --volumes