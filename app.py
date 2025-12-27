import json
import time
from datetime import datetime, timedelta, timezone

import requests
from flask import Flask, render_template, jsonify

from config import Config


app = Flask(__name__, static_folder="static", template_folder="templates")


class Cache:
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


cache = Cache()


def get_tenant_access_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {"app_id": Config.FEISHU_APP_ID, "app_secret": Config.FEISHU_APP_SECRET}
    r = requests.post(url, json=payload, timeout=10)
    r.raise_for_status()
    data = r.json()
    return data.get("tenant_access_token", "")


def list_bitable_records(token):
    headers = {"Authorization": f"Bearer {token}"}
    base = Config.BASE_ID
    table = Config.TABLE_ID
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{base}/tables/{table}/records"
    items = []
    page_token = None
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
    return items


def parse_epoch(val):
    if val is None:
        return None
    try:
        v = int(val)
        if v > 10_000_000_000:
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc)
        return datetime.fromtimestamp(v, tz=timezone.utc)
    except Exception:
        return None


def normalize_wishes(items):
    wishes = []
    for it in items:
        fields = it.get("fields", {}) or {}
        content = fields.get("许愿内容") or fields.get("content") or ""
        author_val = fields.get("许愿人") or fields.get("author") or ""
        def format_author(v):
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
        author = format_author(author_val)
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
    # Fallback when credentials are missing: render with empty list
    if not (Config.FEISHU_APP_ID and Config.FEISHU_APP_SECRET and Config.BASE_ID and Config.TABLE_ID):
        return render_template("index.html", wishes=[], wish_entry_url=Config.WISH_ENTRY_URL)
    cached = cache.get()
    if cached and len(cached) > 0:
        return render_template("index.html", wishes=cached, wish_entry_url=Config.WISH_ENTRY_URL)
    token = get_tenant_access_token()
    items = list_bitable_records(token)
    wishes = normalize_wishes(items)
    wishes = filter_recent_30_days(wishes)
    cache.set(wishes)
    return render_template("index.html", wishes=wishes, wish_entry_url=Config.WISH_ENTRY_URL)


@app.route("/health")
def health():
    env_ok = bool(Config.FEISHU_APP_ID and Config.FEISHU_APP_SECRET and Config.BASE_ID and Config.TABLE_ID)
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
    except Exception:
        result["wish_count"] = 0
        result["fetch_error"] = True
    return jsonify(result)

@app.route("/refresh")
def refresh():
    cache.clear()
    return jsonify({"ok": True})

@app.route("/api/wishes")
def api_wishes():
    if not (Config.FEISHU_APP_ID and Config.FEISHU_APP_SECRET and Config.BASE_ID and Config.TABLE_ID):
        return jsonify([])
    token = get_tenant_access_token()
    items = list_bitable_records(token)
    wishes = normalize_wishes(items)
    wishes = filter_recent_30_days(wishes)
    return jsonify(wishes)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
