import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# BASE DE DONNÉES (TiDB Cloud)
# ==========================================
DATABASE_URL = os.getenv("DATABASE_URL")

# Fallback local
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "leyamo1_1"),
    "port": int(os.getenv("DB_PORT", 3306)),
}

# ==========================================
# URLS DE L'APPLICATION
# ==========================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:5000")
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5000")

# ==========================================
# SÉCURITÉ
# ==========================================
JWT_SECRET = os.getenv("JWT_SECRET", "change-me")

# ==========================================
# MAILGUN (optionnel)
# ==========================================
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")

# ==========================================
# UPLOAD
# ==========================================
UPLOAD_CONFIG = {
    "max_files": 3,
    "max_file_size": 10 * 1024 * 1024,
    "allowed_extensions": {'png', 'jpg', 'jpeg', 'gif', 'webp'},
}

# ==========================================
# CLOUDINARY
# ==========================================
CLOUDINARY_CONFIG = {
    "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
    "api_key": os.getenv("CLOUDINARY_API_KEY"),
    "api_secret": os.getenv("CLOUDINARY_API_SECRET"),
}