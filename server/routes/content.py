"""News, offers, and telemetry routes backed by static JSON or RSS feed."""
import json
import os
import re
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from xml.etree import ElementTree

import requests
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from utils import error_response, success_response

content_bp = Blueprint("content", __name__, url_prefix="/api/content")

DATA_PATH = Path(__file__).resolve().parent.parent / "instance" / "news_feed.json"
OFFERS_DATA_PATH = Path(__file__).resolve().parent.parent / "instance" / "offers_feed.json"
TELEMETRY_PATH = Path(__file__).resolve().parent.parent / "instance" / "news_clicks.jsonl"
DEFAULT_PAGE_SIZE = 6
MAX_PAGE_SIZE = 30
DEFAULT_RSS_FEEDS = [
    "https://www.thehindu.com/sci-tech/agriculture/feeder/default.rss",
    "https://www.thebetterindia.com/feed/",
]
RSS_REQUEST_TIMEOUT = 8
ARTICLE_REQUEST_TIMEOUT = 6
FEED_CACHE_TTL_SECONDS = int(os.environ.get("NEWS_FEED_CACHE_SECONDS", "900"))
MAX_ITEMS_PER_FEED = 20
MAX_ARTICLE_IMAGE_FETCHES = 12

_feed_cache: dict[str, Any] = {"expires_at": 0.0, "data": None}
_article_image_cache: dict[str, str] = {}

TAG_RE = re.compile(r"<[^>]+>")
IMG_SRC_RE = re.compile(r"<img[^>]+src=[\"']([^\"']+)[\"']", flags=re.IGNORECASE)
CANONICAL_URL_RE = re.compile(r"<link[^>]+rel=[\"']canonical[\"'][^>]+href=[\"']([^\"']+)[\"']", flags=re.IGNORECASE)
OG_URL_RE = re.compile(r"<meta[^>]+property=[\"']og:url[\"'][^>]+content=[\"']([^\"']+)[\"']", flags=re.IGNORECASE)
OG_IMAGE_RE = re.compile(
    r"<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"']",
    flags=re.IGNORECASE,
)
FALLBACK_CATEGORY_IMAGES = {
    "weather": "https://upload.wikimedia.org/wikipedia/commons/4/4a/Monsoon_rain_in_Kerala.jpg",
    "policy": "https://upload.wikimedia.org/wikipedia/commons/0/03/Drip_irrigation_in_field.jpg",
    "market": "https://upload.wikimedia.org/wikipedia/commons/d/d4/Wheat_market.jpg",
    "pest": "https://upload.wikimedia.org/wikipedia/commons/c/c7/Fall_armyworm_larva.jpg",
    "soil": "https://upload.wikimedia.org/wikipedia/commons/4/4e/Soil_profile.jpg",
    "general": "https://upload.wikimedia.org/wikipedia/commons/a/a8/Paddy_field_in_India.jpg",
}
FARMING_KEYWORDS = [
    "agriculture",
    "farming",
    "farmer",
    "farmers",
    "crop",
    "crops",
    "harvest",
    "sowing",
    "irrigation",
    "soil",
    "mandi",
    "market",
    "weather",
    "monsoon",
    "rain",
    "drought",
    "fertilizer",
    "pesticide",
    "seed",
    "paddy",
    "wheat",
    "rice",
    "soybean",
    "maize",
    "cotton",
    "livestock",
    "dairy",
    "subsidy",
    "procurement",
    "msp",
    "pest",
    "disease",
]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_int(value: str | None, default: int, minimum: int = 1, maximum: int | None = None) -> int:
    try:
        parsed = int(value or default)
    except ValueError:
        return default
    parsed = max(minimum, parsed)
    if maximum is not None:
        parsed = min(maximum, parsed)
    return parsed


def _get_rss_feed_urls() -> list[str]:
    csv_urls = os.environ.get("PUBLIC_NEWS_RSS_URLS", "").strip()
    single_url = os.environ.get("PUBLIC_NEWS_RSS_URL", "").strip()

    if csv_urls:
        return [url.strip() for url in csv_urls.split(",") if url.strip()]
    if single_url:
        return [single_url]
    return DEFAULT_RSS_FEEDS


def _safe_parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.fromtimestamp(0, tz=timezone.utc)

    normalized = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        pass

    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except (TypeError, ValueError):
        return datetime.fromtimestamp(0, tz=timezone.utc)


def _clean_text(raw_text: str, max_len: int = 280) -> str:
    without_tags = TAG_RE.sub(" ", raw_text or "")
    cleaned = " ".join(unescape(without_tags).split())
    if len(cleaned) <= max_len:
        return cleaned
    return f"{cleaned[:max_len].rstrip()}..."


def _extract_img_from_description(description: str) -> str:
    if not description:
        return ""
    match = IMG_SRC_RE.search(description)
    if not match:
        return ""
    return unescape(match.group(1)).strip()


def _is_google_host(url: str) -> bool:
    host = urlparse(url).netloc.lower()
    return any(domain in host for domain in ["google.com", "googleusercontent.com", "gstatic.com", "googleapis.com"])


def _is_generic_image(url: str) -> bool:
    if not url:
        return True
    return _is_google_host(url)


def _extract_canonical_link(html: str) -> str:
    canonical_match = CANONICAL_URL_RE.search(html)
    if canonical_match:
      return unescape(canonical_match.group(1)).strip()

    og_url_match = OG_URL_RE.search(html)
    if og_url_match:
        return unescape(og_url_match.group(1)).strip()

    for href in re.findall(r'href=["\'](https?://[^"\']+)["\']', html, flags=re.IGNORECASE):
        href = unescape(href).strip()
        if href and not _is_google_host(href):
            return href

    return ""


def _extract_media_image(item: ElementTree.Element) -> str:
    media_content = item.find("{http://search.yahoo.com/mrss/}content")
    if media_content is not None:
        url = (media_content.attrib.get("url") or "").strip()
        if url:
            return url

    media_thumbnail = item.find("{http://search.yahoo.com/mrss/}thumbnail")
    if media_thumbnail is not None:
        url = (media_thumbnail.attrib.get("url") or "").strip()
        if url:
            return url

    enclosure = item.find("enclosure")
    if enclosure is not None:
        content_type = (enclosure.attrib.get("type") or "").lower()
        url = (enclosure.attrib.get("url") or "").strip()
        if url and ("image" in content_type or not content_type):
            return url

    return ""


def _infer_category(title: str, summary: str) -> str:
    blob = f"{title} {summary}".lower()
    if any(keyword in blob for keyword in ["rain", "monsoon", "weather", "heatwave", "imd"]):
        return "weather"
    if any(keyword in blob for keyword in ["market", "price", "mandi", "procurement", "msp"]):
        return "market"
    if any(keyword in blob for keyword in ["subsidy", "policy", "scheme", "government"]):
        return "policy"
    if any(keyword in blob for keyword in ["pest", "disease", "armyworm", "blight"]):
        return "pest"
    if any(keyword in blob for keyword in ["soil", "nutrient", "fertility", "testing"]):
        return "soil"
    return "general"


def _is_farming_story(title: str, summary: str, source_name: str = "") -> bool:
    title_blob = title.lower()
    summary_blob = summary.lower()
    source_blob = source_name.lower()

    if any(keyword in title_blob for keyword in FARMING_KEYWORDS):
        return True

    if any(keyword in summary_blob for keyword in FARMING_KEYWORDS):
        return any(term in source_blob for term in ["agriculture", "farm", "farming", "hindu"])

    return False


def _resolve_article_image(article_url: str) -> str:
    if not article_url:
        return ""
    if article_url in _article_image_cache:
        return _article_image_cache[article_url]

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    }

    try:
        response = requests.get(article_url, timeout=ARTICLE_REQUEST_TIMEOUT, headers=headers)
        response.raise_for_status()
        html = response.text

        meta_match = OG_IMAGE_RE.search(html)
        if meta_match:
            image_url = unescape(meta_match.group(1)).strip()
            if not _is_generic_image(image_url):
                _article_image_cache[article_url] = image_url
                return image_url

        canonical_url = _extract_canonical_link(html)
        if canonical_url and canonical_url != article_url:
            try:
                canonical_response = requests.get(canonical_url, timeout=ARTICLE_REQUEST_TIMEOUT, headers=headers)
                canonical_response.raise_for_status()
                canonical_html = canonical_response.text

                canonical_meta_match = OG_IMAGE_RE.search(canonical_html)
                if canonical_meta_match:
                    image_url = unescape(canonical_meta_match.group(1)).strip()
                    if not _is_generic_image(image_url):
                        _article_image_cache[article_url] = image_url
                        return image_url

                desc_img = _extract_img_from_description(canonical_html)
                if desc_img and not _is_generic_image(desc_img):
                    _article_image_cache[article_url] = desc_img
                    return desc_img
            except Exception:
                pass

        desc_img = _extract_img_from_description(html)
        if desc_img and not _is_generic_image(desc_img):
            _article_image_cache[article_url] = desc_img
            return desc_img
    except Exception:
        pass

    _article_image_cache[article_url] = ""
    return ""


def _fallback_image_for_category(category: str) -> str:
    return FALLBACK_CATEGORY_IMAGES.get(category, FALLBACK_CATEGORY_IMAGES["general"])


def _safe_parse_iso(value: str | None) -> datetime:
    return _safe_parse_datetime(value)


def _region_matches(item_region: str | None, selected_region: str) -> bool:
    normalized_item_region = str(item_region or "").strip().lower()
    normalized_selected_region = selected_region.strip().lower()

    if not normalized_selected_region:
        return True
    if not normalized_item_region:
        return False
    if normalized_selected_region == "india":
        return "india" in normalized_item_region

    # Keep national programs/stories visible for any state-level filter.
    return normalized_selected_region in normalized_item_region or "india" in normalized_item_region


def _filter_by_region_with_priority(items: list[dict[str, Any]], selected_region: str) -> list[dict[str, Any]]:
    normalized_selected_region = selected_region.strip().lower()
    if not normalized_selected_region:
        return items

    if normalized_selected_region == "india":
        return [item for item in items if "india" in str(item.get("region") or "").strip().lower()]

    state_specific: list[dict[str, Any]] = []
    india_wide: list[dict[str, Any]] = []
    for item in items:
        region_value = str(item.get("region") or "").strip().lower()
        if normalized_selected_region in region_value:
            state_specific.append(item)
        elif "india" in region_value:
            india_wide.append(item)

    seen_ids = {str(item.get("id") or "") for item in state_specific}
    for item in india_wide:
        item_id = str(item.get("id") or "")
        if item_id and item_id in seen_ids:
            continue
        state_specific.append(item)

    return state_specific


def _normalize_news(item: dict[str, Any], index: int) -> dict[str, Any]:
    category = str(item.get("category") or "general")
    image_url = str(item.get("image_url") or "").strip()
    return {
        "id": str(item.get("id") or f"news-{index}"),
        "title": str(item.get("title") or "Untitled update"),
        "summary": str(item.get("summary") or ""),
        "image_url": image_url or _fallback_image_for_category(category),
        "url": str(item.get("url") or ""),
        "source": str(item.get("source") or "Unknown"),
        "category": category,
        "region": str(item.get("region") or "India"),
        "published_at": str(item.get("published_at") or _iso_now()),
    }


def _normalize_offer(item: dict[str, Any], index: int) -> dict[str, Any]:
    discount_value = item.get("discount_percent", 0)
    try:
        discount = float(discount_value)
    except (ValueError, TypeError):
        discount = 0.0

    return {
        "id": str(item.get("id") or f"offer-{index}"),
        "title": str(item.get("title") or "Untitled offer"),
        "description": str(item.get("description") or ""),
        "provider": str(item.get("provider") or "Unknown"),
        "url": str(item.get("url") or ""),
        "discount_percent": discount,
        "crop": str(item.get("crop") or "All"),
        "region": str(item.get("region") or "India"),
        "valid_until": str(item.get("valid_until") or _iso_now()),
        "published_at": str(item.get("published_at") or _iso_now()),
    }


def _load_static_feed() -> dict[str, list[dict[str, Any]]]:
    if not DATA_PATH.exists():
        return {"news": [], "offers": []}

    with DATA_PATH.open("r", encoding="utf-8") as fp:
        payload = json.load(fp)

    raw_news = payload.get("news", [])
    raw_offers = payload.get("offers", [])

    news = [_normalize_news(item, idx) for idx, item in enumerate(raw_news, start=1)]
    offers = [_normalize_offer(item, idx) for idx, item in enumerate(raw_offers, start=1)]

    return {"news": news, "offers": offers}


def _load_static_offers() -> list[dict[str, Any]]:
    if OFFERS_DATA_PATH.exists():
        with OFFERS_DATA_PATH.open("r", encoding="utf-8") as fp:
            payload = json.load(fp)
        raw_offers = payload.get("offers", payload if isinstance(payload, list) else [])
        return [_normalize_offer(item, idx) for idx, item in enumerate(raw_offers, start=1)]

    fallback_feed = _load_static_feed()
    return fallback_feed.get("offers", [])


def _parse_rss_items(raw_xml: str, source_name: str = "RSS Feed") -> list[dict[str, Any]]:
    root = ElementTree.fromstring(raw_xml)
    items: list[dict[str, Any]] = []
    article_image_fetches = 0

    for idx, item in enumerate(root.findall(".//item"), start=1):
        if idx > MAX_ITEMS_PER_FEED:
            break

        title = item.findtext("title") or "Untitled update"
        description = item.findtext("description") or ""
        link = item.findtext("link") or ""
        pub_date = item.findtext("pubDate") or _iso_now()
        source = item.findtext("source") or source_name
        summary = _clean_text(description)
        if not _is_farming_story(title, summary, source):
            continue
        category = _infer_category(title, summary)

        image_url = _extract_media_image(item) or _extract_img_from_description(description)
        if not image_url and article_image_fetches < MAX_ARTICLE_IMAGE_FETCHES:
            image_url = _resolve_article_image(link)
            article_image_fetches += 1

        items.append(
            {
                "id": f"rss-{idx}-{abs(hash(link)) % 1000000}",
                "title": title,
                "summary": summary,
                "image_url": image_url,
                "url": link,
                "source": source,
                "category": category,
                "region": "India",
                "published_at": _safe_parse_datetime(pub_date).isoformat(),
            }
        )
    return items


def _load_feed_data() -> dict[str, list[dict[str, Any]]]:
    now_ts = datetime.now(timezone.utc).timestamp()
    cached_data = _feed_cache.get("data")
    expires_at = float(_feed_cache.get("expires_at") or 0)
    if cached_data is not None and now_ts < expires_at:
        return cached_data

    static_feed = _load_static_feed()
    static_feed["offers"] = _load_static_offers()
    rss_urls = _get_rss_feed_urls()
    aggregated_news: list[dict[str, Any]] = []

    for feed_url in rss_urls:
        try:
            response = requests.get(feed_url, timeout=RSS_REQUEST_TIMEOUT)
            response.raise_for_status()
            source_name = (ElementTree.fromstring(response.text).findtext("./channel/title") or "RSS Feed").strip()
            aggregated_news.extend(_parse_rss_items(response.text, source_name))
        except Exception:
            # Continue trying other feeds and keep static fallback available.
            continue

    merged_news = list(static_feed.get("news", []))
    if aggregated_news:
        merged_news.extend(aggregated_news)

    deduped_news: list[dict[str, Any]] = []
    seen = set()
    for item in merged_news:
      dedupe_key = (str(item.get("url")), str(item.get("title"))).__repr__()
      if dedupe_key in seen:
          continue
      seen.add(dedupe_key)
      deduped_news.append(item)

    static_feed["news"] = sorted(
        deduped_news,
        key=lambda item: _safe_parse_datetime(item.get("published_at")),
        reverse=True,
    )

    normalized_news = [_normalize_news(item, idx) for idx, item in enumerate(static_feed.get("news", []), start=1)]
    static_feed["news"] = normalized_news

    _feed_cache["data"] = static_feed
    _feed_cache["expires_at"] = now_ts + FEED_CACHE_TTL_SECONDS
    return static_feed


def _paginate(items: list[dict[str, Any]], page: int, limit: int) -> dict[str, Any]:
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    sliced = items[start:end]

    return {
        "items": sliced,
        "page": page,
        "limit": limit,
        "total": total,
        "has_more": end < total,
    }


@content_bp.route("/headlines", methods=["GET"])
@jwt_required(optional=True)
def get_headlines():
    """Return top headlines for dashboard cards."""
    limit = _parse_int(request.args.get("limit"), 3, minimum=1, maximum=10)
    feed = _load_feed_data()
    sorted_news = sorted(feed["news"], key=lambda item: _safe_parse_iso(item.get("published_at")), reverse=True)
    top_news = sorted_news[:limit]
    return success_response({"items": top_news, "total": len(top_news)})


@content_bp.route("/news", methods=["GET"])
@jwt_required(optional=True)
def get_news():
    """Return paginated farming news feed."""
    page = _parse_int(request.args.get("page"), 1, minimum=1)
    limit = _parse_int(request.args.get("limit"), DEFAULT_PAGE_SIZE, minimum=1, maximum=MAX_PAGE_SIZE)
    category = (request.args.get("category") or "").strip().lower()
    region = (request.args.get("region") or "").strip().lower()

    feed = _load_feed_data()
    news = sorted(feed["news"], key=lambda item: _safe_parse_iso(item.get("published_at")), reverse=True)

    if category:
        news = [item for item in news if str(item.get("category", "")).lower() == category]
    if region:
        news = _filter_by_region_with_priority(news, region)

    return success_response(_paginate(news, page, limit))


@content_bp.route("/offers", methods=["GET"])
@jwt_required(optional=True)
def get_offers():
    """Return paginated active offers."""
    page = _parse_int(request.args.get("page"), 1, minimum=1)
    limit = _parse_int(request.args.get("limit"), DEFAULT_PAGE_SIZE, minimum=1, maximum=MAX_PAGE_SIZE)
    crop = (request.args.get("crop") or "").strip().lower()
    region = (request.args.get("region") or "").strip().lower()

    feed = _load_feed_data()
    now = datetime.now(timezone.utc)

    offers = []
    for item in feed["offers"]:
        expiry = _safe_parse_iso(item.get("valid_until"))
        if expiry >= now:
            offers.append(item)

    offers.sort(key=lambda item: _safe_parse_iso(item.get("published_at")), reverse=True)

    if crop:
        offers = [
            item
            for item in offers
            if crop in str(item.get("crop", "")).lower() or str(item.get("crop", "")).lower() == "all"
        ]
    if region:
        offers = _filter_by_region_with_priority(offers, region)

    return success_response(_paginate(offers, page, limit))


@content_bp.route("/telemetry/click", methods=["POST"])
@jwt_required(optional=True)
def track_click_event():
    """Track click events for future content personalization."""
    payload = request.get_json() or {}
    item_id = str(payload.get("item_id") or "").strip()
    item_type = str(payload.get("item_type") or "").strip().lower()
    source = str(payload.get("source") or "").strip()
    surface = str(payload.get("surface") or "").strip().lower()

    if not item_id or item_type not in {"news", "offer"} or not surface:
        return error_response("item_id, item_type(news|offer), and surface are required.", 400)

    user_id = get_jwt_identity()
    event = {
        "event": "content_click",
        "user_id": str(user_id) if user_id is not None else None,
        "item_id": item_id,
        "item_type": item_type,
        "source": source,
        "surface": surface,
        "created_at": _iso_now(),
    }

    TELEMETRY_PATH.parent.mkdir(parents=True, exist_ok=True)
    with TELEMETRY_PATH.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(event) + "\n")

    return success_response({"ok": True}, "Tracked", 201)
