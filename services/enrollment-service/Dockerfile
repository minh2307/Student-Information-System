FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ARG JAR_FILE=services/enrollment-service/build/libs/enrollment-service-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
