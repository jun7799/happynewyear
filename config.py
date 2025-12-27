import os
from dotenv import load_dotenv


class Config:
    load_dotenv()
    FEISHU_APP_ID = os.getenv("FEISHU_APP_ID", "")
    FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET", "")
    BASE_ID = os.getenv("FEISHU_BASE_ID", "")
    TABLE_ID = os.getenv("FEISHU_TABLE_ID", "")
    CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "60"))
    WISH_ENTRY_URL = "https://e5zve6mvyq.feishu.cn/share/base/form/shrcnOK334hK8JpRn4tLq7sgfQ6"
