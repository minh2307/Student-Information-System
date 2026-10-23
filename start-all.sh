#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

# Stop any old running instances first
bash "$DIR/stop-all.sh" >/dev/null 2>&1 || true

JAVA_BIN="/usr/lib/jvm/java-21-openjdk-amd64/bin/java"
if [ ! -f "$JAVA_BIN" ]; then
    JAVA_BIN="$(which java)"
fi

JVM_OPTS="-Xms128m -Xmx256m -XX:+TieredCompilation -XX:TieredStopAtLevel=1"

echo "=========================================================="
echo " Starting Rikkei EduPortal Microservices & Frontend"
echo " Java version: $($JAVA_BIN -version 2>&1 | head -n 1)"
echo " Memory limit per service: 256MB"
echo "=========================================================="

mkdir -p logs
rm -f .pids

# 1. Start PostgreSQL
echo "[1/8] Starting PostgreSQL..."
docker compose up -d postgres >/dev/null 2>&1

echo "Waiting for PostgreSQL to be ready..."
until docker exec eduportal-postgres pg_isready -U postgres -d academic_db >/dev/null 2>&1; do
    sleep 1
done
echo "PostgreSQL is ready!"

# 2. Start Services with memory limits and nohup
echo "[2/8] Starting Auth Service (port 8081)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/auth-service/build/libs/auth-service-0.0.1-SNAPSHOT.jar > logs/auth-service.log 2>&1 &
echo $! >> .pids

echo "[3/8] Starting Course Service (port 8082)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/course-service/build/libs/course-service-0.0.1-SNAPSHOT.jar > logs/course-service.log 2>&1 &
echo $! >> .pids

echo "[4/8] Starting Enrollment Service (port 8083)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/enrollment-service/build/libs/enrollment-service-0.0.1-SNAPSHOT.jar > logs/enrollment-service.log 2>&1 &
echo $! >> .pids

echo "[5/8] Starting Lecturer Service (port 8085)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/lecturer-service/build/libs/lecturer-service-0.0.1-SNAPSHOT.jar > logs/lecturer-service.log 2>&1 &
echo $! >> .pids

echo "[6/8] Starting AI Service (port 8084)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/ai-service/build/libs/ai-service-0.0.1-SNAPSHOT.jar > logs/ai-service.log 2>&1 &
echo $! >> .pids

# Wait for core services to start binding
echo "Waiting for backend services to initialize (10s)..."
sleep 10

echo "[7/8] Starting API Gateway (port 8080)..."
nohup $JAVA_BIN $JVM_OPTS -jar services/api-gateway/build/libs/api-gateway-0.0.1-SNAPSHOT.jar > logs/api-gateway.log 2>&1 &
echo $! >> .pids

echo "[8/8] Starting Frontend (port 5173)..."
cd frontend
nohup npm run dev -- --host 0.0.0.0 > ../logs/frontend.log 2>&1 &
echo $! >> ../.pids
cd "$DIR"

echo "Waiting for Gateway & Frontend to initialize (5s)..."
sleep 5

echo "=========================================================="
echo " All services launched successfully!"
echo " - Frontend:     http://localhost:5173"
echo " - API Gateway:  http://localhost:8080/api/v1"
echo " - Logs dir:     $DIR/logs"
echo " Run ./stop-all.sh to terminate all background services."
echo "=========================================================="

wait

