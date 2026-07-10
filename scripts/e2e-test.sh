#!/bin/bash
set -euo pipefail

echo "=== Starting test infrastructure ==="
docker compose -f docker-compose.test.yml up -d mongodb clickhouse redis

echo "=== Waiting for services ==="
docker compose -f docker-compose.test.yml wait mongodb
docker compose -f docker-compose.test.yml wait clickhouse
docker compose -f docker-compose.test.yml wait redis

echo "=== Running backend unit tests ==="
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from backend-test backend-test

echo "=== Backend tests passed! ==="

echo "=== Running frontend unit tests ==="
cd front/admin && pnpm test

echo "=== All tests passed! ==="
