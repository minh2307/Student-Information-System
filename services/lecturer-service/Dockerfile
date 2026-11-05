FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ARG JAR_FILE=services/lecturer-service/build/libs/lecturer-service-0.0.1-SNAPSHOT.jar
COPY ${JAR_FILE} app.jar
EXPOSE 8085
ENTRYPOINT ["java", "-jar", "app.jar"]
