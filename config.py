import os
from dotenv import load_dotenv

load_dotenv()

# === BASE DE DONNÉES ===
DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback local (si DATABASE_URL est None)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "leyamo1_1"),
    "port": int(os.getenv("DB_PORT", 3306)),
}

# === R2 ===
R2_CONFIG = {
    "access_key": os.getenv("R2_ACCESS_KEY_ID"),
    "secret_key": os.getenv("R2_SECRET_ACCESS_KEY"),
    "endpoint_url": os.getenv("R2_ENDPOINT_URL"),
    "bucket_name": os.getenv("R2_BUCKET_NAME"),
}

# === AUTRES ===
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")
UPLOAD_CONFIG = {
    "max_files": 5,
    "max_file_size": 10 * 1024 * 1024,
    "allowed_extensions": {'png', 'jpg', 'jpeg', 'gif', 'webp'},
}