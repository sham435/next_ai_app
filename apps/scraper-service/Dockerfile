FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8000

CMD ["python", "-c", "import os; import uvicorn; from main import app; uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))"]
