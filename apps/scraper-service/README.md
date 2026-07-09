# Scraper Service

Python FastAPI service for heavy-duty web scraping using Playwright (Chromium).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/scrape` | Static HTML scrape (BeautifulSoup) |
| POST | `/scrape/selenium` | JS-rendered scrape (Playwright) |
| POST | `/scrape/crawl4ai` | AI-powered extraction |
| POST | `/crawl/deep` | Deep crawling with strategies |
| POST | `/scrape-and-zip` | Scrape + download resources as ZIP |

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `CHROME_BIN` | `/usr/bin/google-chrome-stable` | Chrome path |
| `CHROMEDRIVER_PATH` | `/usr/local/bin/chromedriver` | ChromeDriver path |

## Deploy

```bash
railway up --service scraper
```
