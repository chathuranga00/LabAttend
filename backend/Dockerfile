# ==============================================================================
# LabAttend Backend - Production Multi-Stage Dockerfile
# ==============================================================================
# Multi-stage build for minimal image size, enhanced security, and layer caching.
# Target runtime: Alpine Linux with Eclipse Temurin JRE 21 (Non-root user).
# Compatible with: Render, Railway, Fly.io, AWS ECS, GCP Cloud Run, Docker Compose.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency Caching & Build
# ------------------------------------------------------------------------------
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy Maven Project Object Model first for dependency layer caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy application source code
COPY src ./src

# Build production executable fat JAR without executing test suite
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 2: Hardened, Minimal Runtime Container
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner

# Install wget for Docker / Kubernetes liveness & readiness health checks
RUN apk --no-cache add wget tzdata

# Create dedicated unprivileged non-root system user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy compiled JAR artifact from builder stage
COPY --from=builder /build/target/labattend-backend-*.jar /app/app.jar

# Enforce strict ownership permissions
RUN chown -R appuser:appgroup /app

# Switch to unprivileged non-root user
USER appuser

# Container runtime environment configurations
ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080 \
    JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"

# Expose default application port
EXPOSE 8080

# Production Health Check probe hitting the public /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8080}/api/health || exit 1

# Execute Spring Boot application with dynamic PORT injection
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
