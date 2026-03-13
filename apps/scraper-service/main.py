import os
import sys
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import requests
from bs4 import BeautifulSoup
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    logger.info("=" * 50)
    logger.info("SCRAPER SERVICE STARTING UP")
    logger.info("=" * 50)
    logger.info(f"Python version: {sys.version}")
    logger.info(f"Current directory: {os.getcwd()}")
    logger.info(f"Files in directory: {os.listdir('.')}")
    logger.info(f"Environment PORT: {os.environ.get('PORT', 'Not set')}")
    logger.info("=" * 50)

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Scraper service shutting down")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    url: str
    selector: Optional[str] = None

class ScrapeResponse(BaseModel):
    url: str
    content: str
    method: str
    timestamp: str
    files_found: int = 0

@app.get("/ping")
async def ping():
    logger.info("Ping endpoint called")
    return "pong"

@app.get("/health")
async def health():
    logger.info("Health check called")
    return {
        "status": "healthy",
        "service": "scraper",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "port": os.environ.get("PORT", "8000")
    }

def scrape_static(url: str, selector: Optional[str] = None) -> tuple[str, int]:
    try:
        logger.info(f"Scraping static content from: {url}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        files_found = len(soup.find_all('a', href=True))
        
        if selector:
            elements = soup.select(selector)
            return '\n'.join([str(el) for el in elements]), files_found
        
        return soup.prettify(), files_found
        
    except Exception as e:
        logger.error(f"Static scrape failed: {e}")
        raise

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape(request: ScrapeRequest):
    try:
        logger.info(f"Scrape request received for URL: {request.url}")
        content, files_found = scrape_static(request.url, request.selector)
        
        return ScrapeResponse(
            url=request.url,
            content=content[:50000] if len(content) > 50000 else content,
            method="static",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            files_found=files_found
        )
        
    except requests.RequestException as e:
        logger.error(f"Request failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "service": "Scraper Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ping": "/ping",
            "scrape": "/scrape (POST)"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting uvicorn on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
