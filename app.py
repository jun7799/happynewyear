import json
import logging
import time
from datetime import datetime, timedelta, timezone

import requests
from flask import Flask, render_template, jsonify

from config import Config

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


app = Flask(__name__, static_folder="static", template_folder="templates")


class Cache:
    """简单的内存缓存"""

    def __init__(self):
        self.data = None
        self.ts = 0

    def get(self):
        if self.data is None:
            return None
        if time.time() - self.ts > Config.CACHE_TTL_SECONDS:
            return None
        return self.data

    def set(self, data):
        self.data = data
        self.ts = time.time()

    def clear(self):
        self.data = None
        self.ts = 0


# 愿望数据缓存
cache = Cache()

# 飞书 Token 缓存（有效期 2 小时，提前 5 分钟刷新）
token_cache = {"token": None, "expires_at": 0}


def is_configured():
    """检查飞书配置是否完整"""
    return bool(
        Config.FEISHU_APP_ID
        and Config.FEISHU_APP_SECRET
        and Config.BASE_ID
        and Config.TABLE_ID
    )


def get_tenant_access_token():
    """获取飞书 tenant_access_token，带缓存机制"""
    # 检查缓存是否有效
    if token_cache["token"] and time.time() < token_cache["expires_at"]:
        logger.debug("Using cached token")
        return token_cache["token"]

    # 缓存失效，重新获取
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": Config.FEISHU_APP_ID, "app_secret": Config.FEISHU_APP_SECRET}

    try:
        r = requests.post(url, json=payload, timeout=10)
        r.raise_for_status()
        data = r.json()

        if data.get("code") != 0:
            logger.error(f"Failed to get token: {data.get('msg')}")
            raise Exception(f"Feishu API error: {data.get('msg')}")

        token = data.get("tenant_access_token", "")
        expire = data.get("expire", 7200)

        # 缓存 token，提前 5 分钟刷新
        token_cache["token"] = token
        token_cache["expires_at"] = time.time() + expire - 300

        logger.info("Token refreshed and cached")
        return token

    except requests.RequestException as e:
        logger.error(f"Request error while getting token: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error while getting token: {e}", exc_info=True)
        raise


def list_bitable_records(token):
    """从飞书多维表格获取所有记录"""
    headers = {"Authorization": f"Bearer {token}"}
    base = Config.BASE_ID
    table = Config.TABLE_ID
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{base}/tables/{table}/records"
    items = []
    page_token = None

    try:
        while True:
            params = {"page_size": 100}
            if page_token:
                params["page_token"] = page_token

            r = requests.get(url, headers=headers, params=params, timeout=10)
            r.raise_for_status()

            data = r.json().get("data", {})
            batch = data.get("items", []) or []
            items.extend(batch)

            has_more = data.get("has_more", False)
            page_token = data.get("page_token")

            if not has_more:
                break

        logger.info(f"Fetched {len(items)} records from Feishu")
        return items

    except requests.RequestException as e:
        logger.error(f"Request error while fetching records: {e}", exc_info=True)
        raise
    except Exception as e:
        logger.error(f"Unexpected error while fetching records: {e}", exc_info=True)
        raise


def parse_epoch(val):
    """解析时间戳（支持秒和毫秒）"""
    if val is None:
        return None
    try:
        v = int(val)
        if v > 10_000_000_000:
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc)
        return datetime.fromtimestamp(v, tz=timezone.utc)
    except Exception:
        return None


def format_author(v):
    """格式化作者信息，支持多种数据类型"""
    if isinstance(v, dict):
        return v.get("name") or v.get("en_name") or v.get("email") or ""
    if isinstance(v, list):
        names = []
        for x in v:
            if isinstance(x, dict):
                names.append(x.get("name") or x.get("en_name") or x.get("email") or "")
            else:
                names.append(str(x))
        return ", ".join([n for n in names if n])
    return str(v)


def normalize_wishes(items):
    """将飞书数据标准化为愿望列表"""
    wishes = []
    for it in items:
        fields = it.get("fields", {}) or {}
        content = fields.get("许愿内容") or fields.get("content") or ""
        author_val = fields.get("许愿人") or fields.get("author") or ""
        author = format_author(author_val)

        # 解析时间
        dt_field = fields.get("许愿时间") or fields.get("time") or None
        created_at = parse_epoch(it.get("created_time"))

        if isinstance(dt_field, str):
            try:
                created_at = datetime.fromisoformat(dt_field.replace("Z", "+00:00"))
            except Exception:
                pass
        elif isinstance(dt_field, (int, float)):
            created_at = parse_epoch(dt_field)

        if not created_at:
            created_at = datetime.now(timezone.utc)

        wishes.append(
            {
                "content": str(content),
                "author": str(author),
                "created_at": created_at.isoformat(),
            }
        )

    logger.info(f"Normalized {len(wishes)} wishes")
    return wishes


def filter_recent_30_days(wishes):
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=30)
    out = []
    for w in wishes:
        try:
            dt = datetime.fromisoformat(w["created_at"].replace("Z", "+00:00"))
        except Exception:
            dt = now
        if dt >= cutoff:
            out.append(w)
    return out


@app.route("/")
def index():
    """主页 - 显示许愿列表"""
    # 配置缺失时返回空列表
    if not is_configured():
        logger.warning("Feishu config incomplete, rendering with empty wishes")
        return render_template("index.html", wishes=[], wish_entry_url=Config.WISH_ENTRY_URL)

    # 尝试使用缓存
    cached = cache.get()
    if cached and len(cached) > 0:
        logger.debug(f"Rendering with cached wishes ({len(cached)} items)")
        return render_template("index.html", wishes=cached, wish_entry_url=Config.WISH_ENTRY_URL)

    # 缓存失效，重新获取数据
    try:
        token = get_tenant_access_token()
        items = list_bitable_records(token)
        wishes = normalize_wishes(items)
        wishes = filter_recent_30_days(wishes)
        cache.set(wishes)
        logger.info(f"Rendered page with {len(wishes)} wishes")
        return render_template("index.html", wishes=wishes, wish_entry_url=Config.WISH_ENTRY_URL)
    except Exception as e:
        logger.error(f"Error loading wishes: {e}", exc_info=True)
        # 出错时返回空列表，避免页面崩溃
        return render_template("index.html", wishes=[], wish_entry_url=Config.WISH_ENTRY_URL)


@app.route("/health")
def health():
    """健康检查接口"""
    env_ok = is_configured()
    result = {"env_ok": env_ok, "cached": bool(cache.get())}

    if not env_ok:
        result["wish_count"] = 0
        return jsonify(result)

    try:
        token = get_tenant_access_token()
        items = list_bitable_records(token)
        wishes = normalize_wishes(items)
        wishes = filter_recent_30_days(wishes)
        result["wish_count"] = len(wishes)
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        result["wish_count"] = 0
        result["fetch_error"] = True

    return jsonify(result)


@app.route("/refresh")
def refresh():
    """手动刷新缓存"""
    cache.clear()
    logger.info("Cache cleared manually")
    return jsonify({"ok": True})


@app.route("/api/wishes")
def api_wishes():
    """获取愿望数据的 JSON 接口（复用缓存）"""
    if not is_configured():
        return jsonify([])

    # 优先使用缓存
    cached = cache.get()
    if cached:
        logger.debug("API: returning cached wishes")
        return jsonify(cached)

    # 缓存失效时重新获取
    try:
        token = get_tenant_access_token()
        items = list_bitable_records(token)
        wishes = normalize_wishes(items)
        wishes = filter_recent_30_days(wishes)
        cache.set(wishes)  # 更新缓存
        return jsonify(wishes)
    except Exception as e:
        logger.error(f"API error: {e}", exc_info=True)
        return jsonify([])


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
