FROM python:3.12-slim

# Create a non-root user — running as root in a container is a security risk
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

WORKDIR /app

# Install dependencies first (separate layer — cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Make startup scripts executable
RUN chmod +x start.sh start.prod.sh

# Create uploads directory and give ownership to appuser
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

CMD ["./start.sh"]
