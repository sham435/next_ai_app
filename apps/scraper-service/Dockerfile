FROM python:3.11-slim

WORKDIR /app

# install only required deps for playwright
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libdrm2 \
    libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir playwright>=1.49.0 \
 && playwright install chromium --with-deps

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["python", "main.py"]
