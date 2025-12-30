"""配置管理模块"""
import os
from dotenv import load_dotenv

# 在模块加载时读取环境变量
load_dotenv()


class Config:
    """应用配置类"""

    # 飞书相关配置
    FEISHU_APP_ID = os.getenv("FEISHU_APP_ID", "")
    FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET", "")
    BASE_ID = os.getenv("FEISHU_BASE_ID", "")
    TABLE_ID = os.getenv("FEISHU_TABLE_ID", "")

    # 缓存配置
    CACHE_TTL_SECONDS = int(os.getenv("CACHE_TTL_SECONDS", "60"))

    # 许愿表单链接（可通过环境变量覆盖）
    WISH_ENTRY_URL = os.getenv(
        "WISH_ENTRY_URL",
        "https://e5zve6mvyq.feishu.cn/share/base/form/shrcnOK334hK8JpRn4tLq7sgfQ6"
    )
