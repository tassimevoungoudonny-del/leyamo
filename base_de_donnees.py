import pymysql
import urllib.parse
from config import DATABASE_URL, DB_CONFIG

def obtenir_connexion():
    try:
        if DATABASE_URL:
            parsed = urllib.parse.urlparse(DATABASE_URL)
            conn = pymysql.connect(
                host=parsed.hostname,
                port=parsed.port or 4000,
                user=parsed.username,
                password=parsed.password,
                database=parsed.path[1:] if parsed.path else "leyamo1_1",
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor,
                ssl={'ssl': {'ca': '/etc/ssl/certs/ca-certificates.crt'}}
            )
            return conn
        else:
            conn = pymysql.connect(
                host=DB_CONFIG['host'],
                user=DB_CONFIG['user'],
                password=DB_CONFIG['password'],
                database=DB_CONFIG['database'],
                port=DB_CONFIG['port'],
                charset='utf8mb4',
                cursorclass=pymysql.cursors.DictCursor
            )
            return conn
    except pymysql.Error as erreur:
        print("Erreur de connexion à la BD :", erreur)
        return None