FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ARG JAR_FILE=services/api-gateway/build/libs/api-gateway-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
