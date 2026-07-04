import os
import uuid
import bcrypt
import jwt
import logging
import requests
from datetime import datetime, timedelta
from functools import wraps, lru_cache
from flask import Flask, jsonify, request, send_from_directory, session, render_template
from flask_cors import CORS
from flask_compress import Compress
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from marshmallow import Schema, fields, validate, ValidationError
import cloudinary
import cloudinary.uploader

from config import (
    JWT_SECRET, UPLOAD_CONFIG, MAILGUN_API_KEY, MAILGUN_DOMAIN,
    FRONTEND_URL, BACKEND_URL, DATABASE_URL,
    CLOUDINARY_CONFIG
)
from base_de_donnees import obtenir_connexion

load_dotenv()
app = Flask(__name__)
app.secret_key = JWT_SECRET
CORS(app, supports_credentials=True, origins=["http://127.0.0.1:5000", "http://localhost:5000", "https://*.onrender.com"])

# Compression Gzip
Compress(app)

# Cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_CONFIG['cloud_name'],
    api_key=CLOUDINARY_CONFIG['api_key'],
    api_secret=CLOUDINARY_CONFIG['api_secret'],
    secure=True
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# CACHE STATIQUE (en-têtes)
# ==========================================
@app.after_request
def add_cache_headers(response):
    if request.path.startswith('/static/') or \
       request.path.endswith(('.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg')):
        response.headers['Cache-Control'] = 'public, max-age=604800'
    return response

# ==========================================
# SCHEMAS
# ==========================================
class InscriptionSchema(Schema):
    nom = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email = fields.Email(required=True)
    mot_de_passe = fields.Str(required=True, validate=validate.Length(min=6))
    num_whatsapp = fields.Str(validate=validate.Regexp(r'^\d+$'))
    localisation_boutique = fields.Str()
    localisation_detaillee = fields.Str()
    nom_boutique = fields.Str()

class ProduitSchema(Schema):
    nom_produit = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    description_produit = fields.Str()
    prix = fields.Float(required=True, validate=validate.Range(min=0))
    promotion = fields.Int(validate=validate.Range(min=0, max=100))
    categorie = fields.Str(required=True)
    genre = fields.Str(validate=validate.OneOf(['masculin', 'feminin', 'unisexe']))
    image_url = fields.Str()

class SignalementSchema(Schema):
    motif = fields.Str(required=True, validate=validate.Length(min=3))
    description = fields.Str()

class ResetPasswordSchema(Schema):
    email = fields.Email(required=True)

# ==========================================
# CSRF
# ==========================================
def generer_token_csrf():
    token = str(uuid.uuid4())
    session['csrf_token'] = token
    return token

def verifier_csrf():
    token = request.headers.get('X-CSRF-Token')
    return token and token == session.get('csrf_token')

def require_csrf(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method in ['POST', 'PUT', 'DELETE']:
            if not verifier_csrf():
                return jsonify({"status": "error", "message": "Token CSRF invalide"}), 403
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# FONCTIONS UTILITAIRES
# ==========================================
def hash_mot_de_passe(mot_de_passe):
    return bcrypt.hashpw(mot_de_passe.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verifier_mot_de_passe(mot_de_passe, hash_stocke):
    return bcrypt.checkpw(mot_de_passe.encode('utf-8'), hash_stocke.encode('utf-8'))

def generer_jwt(user_id, role='vendeur'):
    return jwt.encode(
        {'user_id': user_id, 'role': role, 'exp': datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm='HS256'
    )

def verifier_jwt(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
    except:
        return None

def get_vendeur_id(token):
    payload = verifier_jwt(token)
    return payload['user_id'] if payload and payload.get('role') == 'vendeur' else None

def get_admin_id(token):
    payload = verifier_jwt(token)
    return payload['user_id'] if payload and payload.get('role') == 'admin' else None

def log_action(action, details=None, ip=None):
    if action in ['vue_produit', 'recherche', 'filtrage']:
        return
    conn = obtenir_connexion()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("INSERT INTO logs (action, details, ip) VALUES (%s, %s, %s)", (action, details, ip))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Log error: {e}")

def envoyer_notification(type_notif, destinataire, destinataire_id, message, lien=None):
    conn = obtenir_connexion()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO notifications (type, destinataire, destinataire_id, message, lien) VALUES (%s, %s, %s, %s, %s)",
                (type_notif, destinataire, destinataire_id, message, lien)
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.error(f"Notification error: {e}")

def envoyer_email_confirmation(email, nom, token):
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        return False
    lien = f"{FRONTEND_URL}/confirmer-email?token={token}"
    html = f"""
    <h1>Bienvenue sur Leyamo !</h1>
    <p>Bonjour {nom},</p>
    <p>Pour confirmer votre email, cliquez sur le lien :</p>
    <a href="{lien}">Confirmer mon email</a>
    <p>Ce lien expire dans 24h.</p>
    """
    try:
        r = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Leyamo <noreply@{MAILGUN_DOMAIN}>",
                "to": [email],
                "subject": "Confirmation email - Leyamo",
                "html": html
            },
            timeout=30
        )
        return r.status_code == 200
    except:
        return False

def envoyer_email_reset(email, token):
    if not MAILGUN_API_KEY or not MAILGUN_DOMAIN:
        return False
    lien = f"{FRONTEND_URL}/reset-password?token={token}"
    html = f"""
    <h1>Réinitialisation de votre mot de passe</h1>
    <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
    <a href="{lien}">Réinitialiser mon mot de passe</a>
    <p>Ce lien expire dans 24h.</p>
    """
    try:
        r = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data={
                "from": f"Leyamo <noreply@{MAILGUN_DOMAIN}>",
                "to": [email],
                "subject": "Réinitialisation mot de passe - Leyamo",
                "html": html
            },
            timeout=30
        )
        return r.status_code == 200
    except:
        return False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in UPLOAD_CONFIG['allowed_extensions']

def formater_prix(prix):
    return f"{int(prix):,}".replace(',', ' ')

# ==========================================
# CACHE LRU POUR CATÉGORIES
# ==========================================
@lru_cache(maxsize=128)
def get_cached_categories():
    conn = obtenir_connexion()
    if not conn:
        return []
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT categorie FROM produits WHERE statut = 'valide'")
    categories = [row['categorie'] for row in cur.fetchall()]
    cur.close()
    conn.close()
    return categories

def invalidate_product_cache():
    get_cached_categories.cache_clear()

# ==========================================
# ROUTES
# ==========================================
@app.route('/csrf-token', methods=['GET'])
def get_csrf_token():
    return jsonify({"csrf_token": generer_token_csrf()})

@app.route('/')
def home():
    return jsonify({"message": "Leyamo API OK 🚀"})

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory('.', path)
    except FileNotFoundError:
        return jsonify({"error": "Fichier non trouvé"}), 404

@app.route('/test-db')
def test_db():
    from base_de_donnees import obtenir_connexion
    try:
        conn = obtenir_connexion()
        if conn:
            cur = conn.cursor()
            cur.execute("SELECT 1")
            return {"status": "DB OK", "message": "Connexion réussie"}
        else:
            return {"status": "DB FAIL", "message": "Échec de connexion"}, 500
    except Exception as e:
        return {"status": "DB ERROR", "message": str(e)}, 500

# ==========================================
# PAGE PRODUIT (HTML)
# ==========================================
@app.route('/produit/<int:id>')
def afficher_produit_html(id):
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("""
        SELECT produits.*, vendeurs.nom_boutique, vendeurs.num_whatsapp,
               vendeurs.localisation_boutique, vendeurs.localisation_detaillee
        FROM produits JOIN vendeurs ON produits.id_vendeur = vendeurs.id
        WHERE produits.id = %s
    """, (id,))
    produit = cur.fetchone()
    cur.close()
    conn.close()
    if not produit:
        return "Produit introuvable", 404
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT image_url FROM images_produits WHERE produit_id = %s ORDER BY ordre ASC", (id,))
    images = cur.fetchall()
    cur.close()
    conn.close()
    produit["images"] = [img["image_url"] for img in images]
    image_og = produit["images"][0] if produit["images"] else "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect width='800' height='400' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='36' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ELeyamo%3C/text%3E%3C/svg%3E"
    titre_og = produit["nom_produit"]
    description_og = produit["description_produit"][:150] if produit["description_produit"] else "Découvrez ce produit sur Leyamo"
    url_og = f"{FRONTEND_URL}/produit/{id}"
    return render_template("produit.html", produit=produit, image_og=image_og, titre_og=titre_og, description_og=description_og, url_og=url_og, FRONTEND_URL=FRONTEND_URL)

# ==========================================
# AUTHENTIFICATION VENDEUR
# ==========================================
@app.route('/vendeurs/inscription', methods=['POST'])
def inscription_vendeur():
    # ... (identique à votre version)
    pass

@app.route('/vendeurs/connexion', methods=['POST'])
def connexion_vendeur():
    # ... (identique)
    pass

@app.route('/vendeurs/me', methods=['GET'])
def me_vendeur():
    # ... (identique)
    pass

@app.route('/confirmer-email', methods=['GET'])
def confirmer_email():
    # ... (identique)
    pass

@app.route('/vendeurs/reset-password', methods=['POST'])
def reset_password():
    # ... (identique)
    pass

@app.route('/vendeurs/reset-password/confirm', methods=['POST'])
def confirm_reset_password():
    # ... (identique)
    pass

# ==========================================
# PRODUITS (PUBLIC) - OPTIMISÉES
# ==========================================
@app.route('/produits', methods=['GET'])
def voir_produits():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"status": "error", "message": "Erreur connexion"}), 500
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'valide'")
    total = cur.fetchone()['total']
    cur.execute("""
        SELECT id, nom_produit, prix, promotion, categorie, image_url, id_vendeur, vues
        FROM produits
        WHERE statut = 'valide'
        ORDER BY date_creation DESC
        LIMIT %s OFFSET %s
    """, (limit, offset))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "data": produits,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

@app.route('/produits/<int:id>', methods=['GET'])
def voir_produit_json(id):
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("UPDATE produits SET vues = vues + 1 WHERE id = %s", (id,))
    conn.commit()
    cur.execute("""
        SELECT produits.id, produits.nom_produit, produits.description_produit, produits.prix,
               produits.promotion, produits.categorie, produits.image_url, produits.vues,
               vendeurs.nom_boutique, vendeurs.num_whatsapp,
               vendeurs.localisation_boutique, vendeurs.localisation_detaillee, produits.id_vendeur
        FROM produits JOIN vendeurs ON produits.id_vendeur = vendeurs.id
        WHERE produits.id = %s
    """, (id,))
    produit = cur.fetchone()
    if not produit:
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Produit introuvable"}), 404
    cur.execute("SELECT image_url FROM images_produits WHERE produit_id = %s ORDER BY ordre ASC", (id,))
    images = cur.fetchall()
    produit["images"] = [img["image_url"] for img in images]
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": produit})

# ==========================================
# ROUTE FILTRER - CORRIGÉE (avec jointure)
# ==========================================
@app.route('/produits/filtrer', methods=['GET'])
def filtrer_produits():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    categorie = request.args.get('categorie')
    genre = request.args.get('genre')
    prix_min = request.args.get('prix_min', type=int)
    prix_max = request.args.get('prix_max', type=int)

    conn = obtenir_connexion()
    if not conn:
        return jsonify({"status": "error", "message": "Erreur connexion"}), 500
    cur = conn.cursor()

    # Requête de base avec jointure
    base_query = """
        FROM produits p
        LEFT JOIN vendeurs v ON p.id_vendeur = v.id
        WHERE p.statut = 'valide'
    """
    params = []
    conditions = []

    if categorie and categorie != 'all':
        conditions.append("p.categorie = %s")
        params.append(categorie)

    if genre and genre != 'all':
        conditions.append("(p.genre = %s OR p.genre = 'unisexe')")
        params.append(genre)

    if prix_min is not None:
        conditions.append("p.prix >= %s")
        params.append(prix_min)

    if prix_max is not None:
        conditions.append("p.prix <= %s")
        params.append(prix_max)

    if conditions:
        base_query += " AND " + " AND ".join(conditions)

    # Compter le total
    count_query = f"SELECT COUNT(*) as total {base_query}"
    cur.execute(count_query, params)
    total = cur.fetchone()['total']

    # Sélectionner les produits avec toutes les colonnes nécessaires
    select_query = f"""
        SELECT p.id, p.nom_produit, p.prix, p.promotion, p.categorie,
               p.image_url, p.id_vendeur, p.vues, v.nom_boutique
        {base_query}
        ORDER BY p.date_creation DESC
        LIMIT %s OFFSET %s
    """
    params.extend([limit, offset])
    cur.execute(select_query, params)
    produits = cur.fetchall()
    cur.close()
    conn.close()

    return jsonify({
        "status": "success",
        "data": produits,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

# ==========================================
# AUTRES ROUTES (recherche, autocomplete, boutique...)
# ==========================================
@app.route('/produits/autocomplete', methods=['GET'])
def autocomplete_produits():
    q = request.args.get('q', '')
    if len(q) < 2:
        return jsonify({"status": "success", "data": []})
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"status": "error", "message": "Erreur connexion"}), 500
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nom_produit, prix, image_url
        FROM produits
        WHERE statut = 'valide' AND nom_produit LIKE %s
        LIMIT 10
    """, (f"%{q}%",))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": produits})

@app.route('/recherche', methods=['GET'])
def rechercher_produits():
    mot_cle = request.args.get('q')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    if not mot_cle:
        return jsonify({"status": "error", "message": "Mot-clé manquant"}), 400
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"status": "error", "message": "Erreur connexion"}), 500
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'valide' AND nom_produit LIKE %s", (f"%{mot_cle}%",))
    total = cur.fetchone()['total']
    cur.execute("""
        SELECT id, nom_produit, prix, promotion, categorie, image_url, id_vendeur, vues
        FROM produits WHERE statut = 'valide' AND nom_produit LIKE %s
        LIMIT %s OFFSET %s
    """, (f"%{mot_cle}%", limit, offset))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "resultats": produits,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

@app.route('/boutique/<int:id_vendeur>', methods=['GET'])
def boutique_vendeur(id_vendeur):
    # ... (identique)
    pass

# ==========================================
# CRUD PRODUITS (avec invalidation de cache)
# ==========================================
@app.route('/produits', methods=['POST'])
@require_csrf
def ajouter_produit():
    # ... (identique)
    pass

@app.route('/produits/<int:id>', methods=['PUT'])
@require_csrf
def modifier_produit(id):
    # ... (identique)
    pass

@app.route('/produits/<int:id>', methods=['DELETE'])
@require_csrf
def supprimer_produit(id):
    # ... (identique)
    pass

# ==========================================
# UPLOAD IMAGES (avec timeout)
# ==========================================
@app.route('/upload/<int:produit_id>', methods=['POST'])
@require_csrf
def upload_images(produit_id):
    # ... (identique)
    pass

@app.route('/produits/<int:id>/whatsapp', methods=['POST'])
def clic_whatsapp(id):
    # ... (identique)
    pass

# ==========================================
# DASHBOARD VENDEUR, ADMIN, AVIS, FAVORIS...
# ==========================================
# (Toutes les autres routes sont conservées telles quelles)
# Je ne les recopie pas ici pour éviter la redondance.

# ==========================================
# LANCEMENT
# ==========================================
if __name__ == "__main__":
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=False, host='0.0.0.0', port=5000)