FROM eclipse-temurin:17-jdk AS java-build 
WORKDIR /build
COPY backend ./
RUN ./gradlew bootJar --no-daemon

# STAGE 2: Build the C++ engine
FROM debian:bookworm AS cpp-build
RUN apt-get update && apt-get install -y --no-install-recommends \
        cmake \
        make \
        g++ \
        nlohmann-json3-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /engine
COPY engine ./
RUN cmake -S . -B build -DCMAKE_BUILD_TYPE=Release \
      -DCMAKE_PREFIX_PATH=/usr \
      -DON_THE_MONEY_BUILD_TESTS=OFF && \
    cmake --build build -j --target run_engine

# STAGE 3: Runtime
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=java-build /build/build/libs/onthemoney-0.0.1-SNAPSHOT.jar ./app.jar
COPY --from=cpp-build /engine/build/src/run_engine ./run_engine
RUN chmod +x run_engine
ENV ENGINE_BINARY_PATH=/app/run_engine
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"] 
