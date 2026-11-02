FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ARG JAR_FILE=services/auth-service/build/libs/auth-service-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
