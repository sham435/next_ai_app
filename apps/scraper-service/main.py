import os
import sys
import logging
import zipfile
import io
import time
import tempfile
import shutil
import asyncio
import certifi
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import requests
from bs4 import BeautifulSoup

# Set default SSL cert path for requests
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# Selenium imports
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# Crawl4AI imports
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, CacheMode, BrowserConfig
from crawl4ai.content_scraping_strategy import LXMLWebScrapingStrategy
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy, DFSDeepCrawlStrategy, BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.filters import (
    FilterChain,
    URLPatternFilter,
    DomainFilter,
    ContentTypeFilter,
)
from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer

# Import verification at module load time
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

logger.info("MODULE LOADING - Starting imports...")

# Verify critical imports work
try:
    from selenium import webdriver
    logger.info("MODULE LOAD: Selenium imported successfully")
except Exception as e:
    logger.error(f"MODULE LOAD: Failed to import selenium: {e}")

try:
    from crawl4ai import AsyncWebCrawler
    logger.info("MODULE LOAD: Crawl4AI imported successfully")
except Exception as e:
    logger.error(f"MODULE LOAD: Failed to import crawl4ai: {e}")

logger.info("MODULE LOADING - Imports complete")

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
    
    # Log all registered routes
    try:
        routes = [r.path for r in app.routes if hasattr(r, 'path')]
        logger.info(f"Total routes: {len(routes)}")
        for p in routes:
            logger.info(f"Route: {p}")
    except Exception as e:
        logger.error(f"Failed to log routes: {e}")
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

class SeleniumScrapeRequest(BaseModel):
    url: str
    wait_for: Optional[str] = None
    scroll: bool = False
    screenshot: bool = False

class Crawl4AIRequest(BaseModel):
    url: str
    max_depth: int = 1
    max_pages: int = 10
    scroll: bool = True
    screenshot: bool = False

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

def scrape_with_selenium(url: str, wait_for: Optional[str] = None, scroll: bool = False) -> tuple[str, Optional[str]]:
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    
    chrome_bin = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome-stable")
    chromedriver_path = os.environ.get("CHROMEDRIVER_PATH", "/usr/local/bin/chromedriver")
    
    service = Service(executable_path=chromedriver_path)
    options.binary_location = chrome_bin
    
    driver = None
    try:
        logger.info(f"Starting Selenium scrape for: {url}")
        driver = webdriver.Chrome(service=service, options=options)
        driver.get(url)
        
        if wait_for:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, wait_for))
            )
        
        if scroll:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1)
        
        html = driver.page_source
        screenshot = driver.get_screenshot_as_base64() if scroll else None
        
        return html, screenshot
        
    except Exception as e:
        logger.error(f"Selenium scrape failed: {e}")
        raise
    finally:
        if driver:
            driver.quit()

@app.post("/scrape/selenium", response_model=ScrapeResponse)
async def scrape_selenium(request: SeleniumScrapeRequest):
    try:
        logger.info(f"Selenium scrape request for: {request.url}")
        html, _ = scrape_with_selenium(request.url, request.wait_for, request.scroll)
        
        soup = BeautifulSoup(html, 'html.parser')
        files_found = len(soup.find_all('a', href=True))
        
        return ScrapeResponse(
            url=request.url,
            content=html[:50000] if len(html) > 50000 else html,
            method="selenium",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            files_found=files_found
        )
    except Exception as e:
        logger.error(f"Selenium scrape failed: {e}")
        raise HTTPException(status_code=500, detail=f"Selenium scrape failed: {str(e)}")

async def scrape_with_crawl4ai(url: str, max_depth: int = 1, max_pages: int = 10) -> tuple[str, int]:
    chrome_path = os.environ.get("CHROME_BIN", "/usr/bin/google-chrome-stable")
    
    config = CrawlerRunConfig(
        scraping_strategy=LXMLWebScrapingStrategy(),
        cache_mode=CacheMode.BYPASS,
        verbose=False,
        js_enabled=True,
        wait_for_selector="body",
        browser_config=BrowserConfig(
            executable_path=chrome_path,
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-setuid-sandbox"
            ]
        )
    )
    
    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun(url=url, config=config)
        
        if results:
            first_result = results[0]
            html = first_result.markdown or first_result.html or ""
            files_found = len(results)
            return html, files_found
        return "", 0

async def scrape_with_crawl4ai_ai(url: str, query: str = None) -> tuple[str, dict, int]:
    """AI-powered extraction using Crawl4AI's LLM extraction"""
    from crawl4ai.extraction_strategy import LLMExtractionStrategy
    
    extraction_strategy = LLMExtractionStrategy(
        provider="openai/gpt-4o-mini",
        api_token=os.getenv("OPENAI_API_KEY", ""),
        extraction_type="content" if not query else "query",
        query=query,
    )
    
    config = CrawlerRunConfig(
        extraction_strategy=extraction_strategy,
        cache_mode=CacheMode.BYPASS,
        js_enabled=True,
    )
    
    async with AsyncWebCrawler() as crawler:
        results = await crawler.arun(url=url, config=config)
        
        if results:
            first_result = results[0]
            html = first_result.markdown or first_result.html or ""
            # Try to get extracted JSON data
            extracted = None
            if hasattr(first_result, 'extracted_content'):
                try:
                    extracted = first_result.extracted_content
                except:
                    pass
            return html, extracted, len(results)
        return "", None, 0

class Crawl4AIExtractRequest(BaseModel):
    url: str
    query: Optional[str] = None
    extract_json: bool = False


class DeepCrawlRequest(BaseModel):
    url: str
    strategy: str = "bfs"
    max_depth: int = 2
    max_pages: Optional[int] = None
    score_threshold: Optional[float] = None
    include_external: bool = False
    allowed_domains: Optional[list[str]] = None
    blocked_domains: Optional[list[str]] = None
    url_patterns: Optional[list[str]] = None
    content_types: Optional[list[str]] = ["text/html"]
    keywords: Optional[list[str]] = None
    keyword_weight: float = 1.0
    stream: bool = False

@app.post("/scrape/crawl4ai", response_model=ScrapeResponse)
async def scrape_crawl4ai(request: Crawl4AIRequest):
    try:
        logger.info(f"Crawl4AI scrape request for: {request.url}")
        html, files_found = await scrape_with_crawl4ai(
            request.url, 
            request.max_depth, 
            request.max_pages
        )
        
        return ScrapeResponse(
            url=request.url,
            content=html[:50000] if len(html) > 50000 else html,
            method="crawl4ai",
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            files_found=files_found
        )
    except Exception as e:
        logger.error(f"Crawl4AI scrape failed: {e}")
        raise HTTPException(status_code=500, detail=f"Crawl4AI scrape failed: {str(e)}")


async def deep_crawl(request: DeepCrawlRequest):
    filters = []
    if request.allowed_domains or request.blocked_domains:
        filters.append(DomainFilter(
            allowed_domains=request.allowed_domains or [],
            blocked_domains=request.blocked_domains or []
        ))
    if request.url_patterns:
        filters.append(URLPatternFilter(patterns=request.url_patterns))
    if request.content_types:
        filters.append(ContentTypeFilter(allowed_types=request.content_types))
    filter_chain = FilterChain(filters) if filters else None

    scorer = None
    if request.keywords:
        scorer = KeywordRelevanceScorer(
            keywords=request.keywords,
            weight=request.keyword_weight
        )

    strategy_map = {
        "bfs": BFSDeepCrawlStrategy,
        "dfs": DFSDeepCrawlStrategy,
        "bestfirst": BestFirstCrawlingStrategy,
    }

    strategy_class = strategy_map.get(request.strategy)
    if not strategy_class:
        raise HTTPException(status_code=400, detail=f"Invalid strategy: {request.strategy}")

    strategy = strategy_class(
        max_depth=request.max_depth,
        include_external=request.include_external,
        filter_chain=filter_chain,
        url_scorer=scorer,
        max_pages=request.max_pages,
        score_threshold=request.score_threshold
    )

    config = CrawlerRunConfig(
        deep_crawl_strategy=strategy,
        scraping_strategy=LXMLWebScrapingStrategy(),
        stream=request.stream,
        verbose=True,
        cache_mode=CacheMode.BYPASS
    )

    async with AsyncWebCrawler() as crawler:
        if request.stream:
            return crawler.arun(url=request.url, config=config)
        else:
            results = await crawler.arun(url=request.url, config=config)
            output = []
            for r in results:
                output.append({
                    "url": r.url,
                    "depth": r.metadata.get("depth"),
                    "score": r.metadata.get("score"),
                    "html": r.markdown[:500] if r.markdown else r.html[:500] if r.html else None,
                })
            return output


@app.post("/crawl/deep")
async def deep_crawl_endpoint(request: DeepCrawlRequest):
    try:
        logger.info(f"Deep crawl request for: {request.url}, strategy: {request.strategy}")
        
        if request.stream:
            async def event_generator():
                crawler_results = await deep_crawl(request)
                async for result in crawler_results:
                    import json
                    data = {
                        'url': result.url,
                        'depth': result.metadata.get('depth'),
                        'score': result.metadata.get('score'),
                        'html': result.markdown[:500] if result.markdown else result.html[:500] if result.html else None,
                    }
                    yield f"data: {json.dumps(data)}\n\n"
            
            return StreamingResponse(event_generator(), media_type="text/event-stream")
        else:
            results = await deep_crawl(request)
            return {
                "total": len(results),
                "results": results
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Deep crawl failed: {e}")
        raise HTTPException(status_code=500, detail=f"Deep crawl failed: {str(e)}")

@app.get("/")
async def root():
    return {
        "service": "Scraper Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "ping": "/ping",
            "scrape": "/scrape (POST)",
            "scrape-and-zip": "/scrape-and-zip (POST)",
            "files": "/files/{url} (GET)",
            "crawl4ai": "/scrape/crawl4ai (POST)",
            "deep-crawl": "/crawl/deep (POST)"
        }
    }


@app.post("/scrape-and-zip")
async def scrape_and_zip(request: ScrapeRequest):
    try:
        logger.info(f"Scraping and zipping: {request.url}")
        
        with tempfile.TemporaryDirectory() as temp_dir:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            response = requests.get(request.url, headers=headers, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            html_path = os.path.join(temp_dir, "index.html")
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(soup.prettify())
            
            files_found = 0
            for tag in soup.find_all(['link', 'script', 'img', 'a']):
                src = tag.get('src') or tag.get('href')
                if src and not src.startswith(('http://', 'https://')):
                    if src.startswith('//'):
                        full_url = f"https:{src}"
                    elif src.startswith('/'):
                        base_url = '/'.join(request.url.split('/')[:3])
                        full_url = f"{base_url}{src}"
                    else:
                        base_url = request.url.rstrip('/')
                        full_url = f"{base_url}/{src.lstrip('/')}"
                    
                    try:
                        file_response = requests.get(full_url, headers=headers, timeout=10)
                        if file_response.status_code == 200:
                            file_name = src.split('/')[-1] or 'file.bin'
                            subdir = os.path.dirname(src.lstrip('/'))
                            if subdir:
                                os.makedirs(os.path.join(temp_dir, subdir), exist_ok=True)
                            
                            file_path = os.path.join(temp_dir, subdir, file_name)
                            
                            with open(file_path, 'wb') as f:
                                f.write(file_response.content)
                            files_found += 1
                            logger.info(f"Downloaded: {file_name}")
                    except Exception as e:
                        logger.warning(f"Failed to download {src}: {e}")
            
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for root_dir, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = os.path.join(root_dir, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zip_file.write(file_path, arcname)
            
            zip_buffer.seek(0)
            
            return StreamingResponse(
                zip_buffer,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename=scraped_{int(time.time())}.zip"
                }
            )
            
    except Exception as e:
        logger.error(f"Scrape and zip failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/files/{url:path}")
async def list_files(url: str):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        files = []
        
        for tag in soup.find_all(['link', 'script', 'img', 'a']):
            src = tag.get('src') or tag.get('href')
            if src:
                files.append({
                    'url': src,
                    'type': tag.name,
                    'text': tag.get_text(strip=True)[:100]
                })
        
        return {
            'url': url,
            'files_found': len(files),
            'files': files[:50]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    logger.info(f"Starting uvicorn on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
