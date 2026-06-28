import os
from dotenv import load_dotenv
from base_de_donnees import obtenir_connexion

load_dotenv()

print("DATABASE_URL =", os.getenv("DATABASE_URL"))

conn = obtenir_connexion()
if conn:
    print("✅ Connexion réussie")
    cur = conn.cursor()
    cur.execute("SELECT DATABASE()")
    print("Base :", cur.fetchone())
    conn.close()
else:
    print("❌ Échec")