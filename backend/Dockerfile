FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q package -DskipTests \
      -Dmaven.wagon.http.retryHandler.count=10 \
      -Dmaven.wagon.httpconnectionManager.ttlSeconds=25

FROM eclipse-temurin:17-jre
RUN useradd -r -u 1001 app
USER app
COPY --from=build /app/target/*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java","-XX:MaxRAMPercentage=75","-jar","/app.jar"]
