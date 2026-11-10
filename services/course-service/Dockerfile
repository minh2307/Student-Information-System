FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Non-root user for security compliance
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ARG JAR_FILE=services/course-service/build/libs/course-service-0.0.1-SNAPSHOT.jar
COPY --chown=appuser:appgroup ${JAR_FILE} app.jar

USER appuser

EXPOSE 8082

# JVM tuning optimized for 1GB VPS constraint
ENV JAVA_OPTS="-Xmx110m -Xms40m -XX:+UseSerialGC -XX:TieredStopAtLevel=1"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8082/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
