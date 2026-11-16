FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Non-root user for security compliance
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

ARG JAR_FILE=services/lecturer-service/build/libs/lecturer-service-0.0.1-SNAPSHOT.jar
COPY --chown=appuser:appgroup ${JAR_FILE} app.jar

USER appuser

EXPOSE 8085

# JVM tuning standardized for 1GB VPS constraint
ENV JAVA_OPTS="-Xmx120m -Xms40m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Djava.security.egd=file:/dev/./urandom"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8085/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
