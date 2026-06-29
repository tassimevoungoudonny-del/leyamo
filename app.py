import os
import uuid
import bcrypt
import jwt
import logging
import requests
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session, render_template
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from marshmallow import Schema, fields, validate, ValidationError

from config import (
    JWT_SECRET, UPLOAD_CONFIG, MAILGUN_API_KEY, MAILGUN_DOMAIN,
    R2_CONFIG, FRONTEND_URL, BACKEND_URL, DATABASE_URL
)
from base_de_donnees import obtenir_connexion

load_dotenv()
app = Flask(__name__)
app.secret_key = JWT_SECRET
CORS(app, supports_credentials=True, origins=["http://127.0.0.1:5000", "http://localhost:5000", "https://*.onrender.com"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    categorie = fields.Str(required=True)
    genre = fields.Str(validate=validate.OneOf(['masculin', 'feminin', 'unisexe']))
    image_url = fields.Str()

class SignalementSchema(Schema):
    motif = fields.Str(required=True, validate=validate.Length(min=3))
    description = fields.Str()

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

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in UPLOAD_CONFIG['allowed_extensions']

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

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory('uploads', filename)

@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory('.', path)
    except FileNotFoundError:
        return jsonify({"error": "Fichier non trouvé"}), 404

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
    image_og = produit["images"][0] if produit["images"] else "https://via.placeholder.com/800x400"
    titre_og = produit["nom_produit"]
    description_og = produit["description_produit"][:150] if produit["description_produit"] else "Découvrez ce produit sur Leyamo"
    url_og = f"{FRONTEND_URL}/produit/{id}"
    return render_template("produit.html", produit=produit, image_og=image_og, titre_og=titre_og, description_og=description_og, url_og=url_og, FRONTEND_URL=FRONTEND_URL)

# ==========================================
# AUTHENTIFICATION VENDEUR
# ==========================================
@app.route('/vendeurs/inscription', methods=['POST'])
def inscription_vendeur():
    try:
        data = InscriptionSchema().load(request.get_json())
    except ValidationError as err:
        return jsonify({"status": "error", "message": "Données invalides", "errors": err.messages}), 400
    mdp_hash = hash_mot_de_passe(data['mot_de_passe'])
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"message": "Erreur connexion BD"}), 500
    cur = conn.cursor()
    try:
        cur.execute("""
            INSERT INTO vendeurs (nom, email, mot_de_passe, num_whatsapp, localisation_boutique, localisation_detaillee, nom_boutique)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data['nom'], data['email'], mdp_hash, data.get('num_whatsapp'), data.get('localisation_boutique'),
              data.get('localisation_detaillee'), data.get('nom_boutique')))
        conn.commit()
        vendeur_id = cur.lastrowid
        token = str(uuid.uuid4())
        cur.execute("INSERT INTO email_tokens (email, token, type) VALUES (%s, %s, 'confirmation')", (data['email'], token))
        conn.commit()
        envoyer_email_confirmation(data['email'], data['nom'], token)
        log_action("inscription_vendeur", f"Email: {data['email']}", request.remote_addr)
        envoyer_notification("nouveau_vendeur", "admin", 1, f"Nouveau vendeur : {data['nom']}", "/admin.html#vendeurs")
        cur.close()
        conn.close()
        return jsonify({"message": "Inscription réussie. Vérifiez votre email."}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/vendeurs/connexion', methods=['POST'])
def connexion_vendeur():
    data = request.get_json()
    if not data.get('email') or not data.get('mot_de_passe'):
        return jsonify({"message": "Email et mot de passe obligatoires"}), 400
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"message": "Erreur connexion BD"}), 500
    cur = conn.cursor()
    cur.execute("SELECT * FROM vendeurs WHERE email = %s", (data['email'],))
    vendeur = cur.fetchone()
    cur.close()
    conn.close()
    if not vendeur or not verifier_mot_de_passe(data['mot_de_passe'], vendeur["mot_de_passe"]):
        return jsonify({"message": "Email ou mot de passe incorrect"}), 401
    if not vendeur["email_confirme"]:
        return jsonify({"message": "Veuillez confirmer votre email"}), 403
    if vendeur["statut"] != "valide":
        return jsonify({"message": "Compte en attente de validation"}), 403
    token_jwt = generer_jwt(vendeur["id"], role='vendeur')
    csrf_token = generer_token_csrf()
    log_action("connexion_vendeur", f"Email: {data['email']}", request.remote_addr)
    return jsonify({"message": "Connexion réussie", "token": token_jwt, "csrf_token": csrf_token})

@app.route('/vendeurs/me', methods=['GET'])
def me_vendeur():
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT id, nom, email, num_whatsapp, localisation_boutique, localisation_detaillee, nom_boutique, statut FROM vendeurs WHERE id = %s", (id_vendeur,))
    vendeur = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": vendeur})

@app.route('/confirmer-email', methods=['GET'])
def confirmer_email():
    token = request.args.get('token')
    if not token:
        return jsonify({"message": "Token manquant"}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT email FROM email_tokens WHERE token = %s AND type = 'confirmation' AND date_expiration > NOW()", (token,))
    token_data = cur.fetchone()
    if not token_data:
        cur.close()
        conn.close()
        return jsonify({"message": "Token invalide ou expiré"}), 400
    cur.execute("UPDATE vendeurs SET email_confirme = TRUE WHERE email = %s", (token_data['email'],))
    conn.commit()
    cur.execute("DELETE FROM email_tokens WHERE token = %s", (token,))
    conn.commit()
    cur.close()
    conn.close()
    log_action("confirmation_email", f"Email: {token_data['email']}", request.remote_addr)
    return jsonify({"message": "Email confirmé avec succès !"})

# ==========================================
# PRODUITS (PUBLIC)
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
        SELECT * FROM produits
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
        SELECT produits.*, vendeurs.nom_boutique, vendeurs.num_whatsapp,
               vendeurs.localisation_boutique, vendeurs.localisation_detaillee
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

@app.route('/produits/filtrer', methods=['GET'])
def filtrer_produits():
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    categorie = request.args.get('categorie')
    genre = request.args.get('genre')
    conn = obtenir_connexion()
    cur = conn.cursor()
    requete = "SELECT * FROM produits WHERE statut = 'valide'"
    params = []
    if categorie and categorie != 'all':
        requete += " AND categorie = %s"
        params.append(categorie)
    if genre and genre != 'all':
        requete += " AND (genre = %s OR genre = 'unisexe')"
        params.append(genre)
    count_requete = requete.replace("SELECT *", "SELECT COUNT(*) as total")
    cur.execute(count_requete, params)
    total = cur.fetchone()['total']
    requete += " ORDER BY date_creation DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])
    cur.execute(requete, params)
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "data": produits,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

@app.route('/recherche', methods=['GET'])
def rechercher_produits():
    mot_cle = request.args.get('q')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    if not mot_cle:
        return jsonify({"status": "error", "message": "Mot-clé manquant"}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'valide' AND nom_produit LIKE %s", (f"%{mot_cle}%",))
    total = cur.fetchone()['total']
    cur.execute("""
        SELECT * FROM produits WHERE statut = 'valide' AND nom_produit LIKE %s
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
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("""
        SELECT id, nom, nom_boutique, localisation_boutique, localisation_detaillee, num_whatsapp
        FROM vendeurs WHERE id = %s AND statut = 'valide'
    """, (id_vendeur,))
    vendeur = cur.fetchone()
    if not vendeur:
        cur.close()
        conn.close()
        return jsonify({"message": "Boutique introuvable"}), 404
    cur.execute("""
        SELECT id, nom_produit, description_produit, prix, vues, clic_whatsapp, image_url
        FROM produits WHERE id_vendeur = %s AND statut = 'valide'
    """, (id_vendeur,))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"boutique": vendeur, "produits": produits})

# ==========================================
# PRODUITS (CRUD VENDEUR)
# ==========================================
@app.route('/produits', methods=['POST'])
@require_csrf
def ajouter_produit():
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    try:
        data = ProduitSchema().load(request.get_json())
    except ValidationError as err:
        return jsonify({"status": "error", "message": "Données invalides", "errors": err.messages}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT id FROM produits WHERE nom_produit = %s AND id_vendeur = %s", (data['nom_produit'], id_vendeur))
    if cur.fetchone():
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "❌ Vous avez déjà un produit avec ce nom."}), 400
    try:
        cur.execute("""
            INSERT INTO produits (nom_produit, description_produit, prix, categorie, genre, image_url, id_vendeur)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (data['nom_produit'], data.get('description_produit', ''), data['prix'], data['categorie'],
              data.get('genre', 'unisexe'), data.get('image_url', ''), id_vendeur))
        conn.commit()
        produit_id = cur.lastrowid
        log_action("ajout_produit", f"Produit: {data['nom_produit']}", request.remote_addr)
        envoyer_notification("nouveau_produit", "admin", 1, f"Nouveau produit : {data['nom_produit']}", "/admin.html#produits")
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Produit ajouté 🚀", "produit_id": produit_id}), 201
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/produits/<int:id>', methods=['PUT'])
@require_csrf
def modifier_produit(id):
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    try:
        data = ProduitSchema(partial=True).load(request.get_json())
    except ValidationError as err:
        return jsonify({"status": "error", "message": "Données invalides", "errors": err.messages}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT id_vendeur FROM produits WHERE id = %s", (id,))
    produit = cur.fetchone()
    if not produit or produit["id_vendeur"] != id_vendeur:
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Accès refusé"}), 403
    try:
        cur.execute("""
            UPDATE produits SET nom_produit=%s, description_produit=%s, prix=%s, categorie=%s, image_url=%s
            WHERE id=%s
        """, (data.get('nom_produit'), data.get('description_produit'), data.get('prix'),
              data.get('categorie'), data.get('image_url'), id))
        conn.commit()
        log_action("modification_produit", f"Produit ID: {id}", request.remote_addr)
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Produit modifié 🚀"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/produits/<int:id>', methods=['DELETE'])
@require_csrf
def supprimer_produit(id):
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT id_vendeur FROM produits WHERE id = %s", (id,))
    produit = cur.fetchone()
    if not produit or produit["id_vendeur"] != id_vendeur:
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Accès refusé"}), 403
    try:
        cur.execute("DELETE FROM produits WHERE id = %s", (id,))
        conn.commit()
        log_action("suppression_produit", f"Produit ID: {id}", request.remote_addr)
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Produit supprimé"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==========================================
# UPLOAD IMAGES (local pour Render)
# ==========================================
@app.route('/upload/<int:produit_id>', methods=['POST'])
@require_csrf
def upload_images(produit_id):
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT id_vendeur FROM produits WHERE id = %s", (produit_id,))
    produit = cur.fetchone()
    if not produit or produit["id_vendeur"] != id_vendeur:
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Accès refusé"}), 403
    fichiers = request.files.getlist('images')
    if len(fichiers) > UPLOAD_CONFIG['max_files']:
        return jsonify({"status": "error", "message": f"Maximum {UPLOAD_CONFIG['max_files']} images"}), 400
    images_urls = []
    os.makedirs('uploads', exist_ok=True)
    for i, fichier in enumerate(fichiers):
        if fichier and allowed_file(fichier.filename):
            fichier.seek(0, os.SEEK_END)
            taille = fichier.tell()
            fichier.seek(0)
            if taille > UPLOAD_CONFIG['max_file_size']:
                return jsonify({"status": "error", "message": "Chaque image < 10 Mo"}), 400
            nom_secure = secure_filename(fichier.filename)
            nom_unique = f"produit_{produit_id}_{i}_{nom_secure}"
            chemin = os.path.join('uploads', nom_unique)
            fichier.save(chemin)
            url = f"{BACKEND_URL}/uploads/{nom_unique}"
            cur.execute("INSERT INTO images_produits (produit_id, image_url, ordre) VALUES (%s, %s, %s)", (produit_id, url, i))
            images_urls.append(url)
    conn.commit()
    cur.close()
    conn.close()
    log_action("upload_images", f"Produit ID: {produit_id}, {len(images_urls)} images", request.remote_addr)
    return jsonify({
        "status": "success",
        "message": f"{len(images_urls)} images uploadées",
        "images": images_urls
    }), 201

@app.route('/produits/<int:id>/whatsapp', methods=['POST'])
def clic_whatsapp(id):
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("UPDATE produits SET clic_whatsapp = clic_whatsapp + 1 WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "message": "Clic WhatsApp enregistré"})

# ==========================================
# DASHBOARD VENDEUR
# ==========================================
@app.route('/vendeurs/me/dashboard', methods=['GET'])
def me_dashboard():
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM vendeurs WHERE id = %s", (id_vendeur,))
    vendeur = cur.fetchone()
    cur.execute("""
        SELECT id, nom_produit, prix, categorie, vues, clic_whatsapp, date_creation, image_url, statut, motif_refus
        FROM produits WHERE id_vendeur = %s ORDER BY date_creation DESC
    """, (id_vendeur,))
    produits = cur.fetchall()
    cur.execute("""
        SELECT COUNT(*) as total_produits, SUM(vues) as total_vues, SUM(clic_whatsapp) as total_clics
        FROM produits WHERE id_vendeur = %s
    """, (id_vendeur,))
    stats = cur.fetchone()
    cur.close()
    conn.close()
    return jsonify({"vendeur": vendeur, "statistiques": stats, "produits": produits})

@app.route('/vendeurs/me/produits/refuses', methods=['GET'])
def produits_refuses_vendeur():
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM produits WHERE id_vendeur = %s AND statut = 'refuse' ORDER BY date_creation DESC", (id_vendeur,))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": produits})

@app.route('/vendeurs/me/supprimer', methods=['DELETE'])
@require_csrf
def supprimer_compte_vendeur():
    token = request.headers.get("Authorization")
    id_vendeur = get_vendeur_id(token)
    if not id_vendeur:
        return jsonify({"status": "error", "message": "Non authentifié"}), 401
    conn = obtenir_connexion()
    if not conn:
        return jsonify({"status": "error", "message": "Erreur connexion BD"}), 500
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM vendeurs WHERE id = %s", (id_vendeur,))
        conn.commit()
        log_action("suppression_compte_vendeur", f"Vendeur ID: {id_vendeur}", request.remote_addr)
        cur.close()
        conn.close()
        return jsonify({"status": "success", "message": "Votre compte a été supprimé."}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==========================================
# SIGNALEMENTS
# ==========================================
@app.route('/produits/<int:id>/signaler', methods=['POST'])
def signaler_produit(id):
    try:
        data = SignalementSchema().load(request.get_json())
    except ValidationError as err:
        return jsonify({"status": "error", "message": "Données invalides", "errors": err.messages}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT nom_produit FROM produits WHERE id = %s", (id,))
    produit = cur.fetchone()
    if not produit:
        cur.close()
        conn.close()
        return jsonify({"status": "error", "message": "Produit introuvable"}), 404
    cur.execute("INSERT INTO signalements (produit_id, motif, description) VALUES (%s, %s, %s)", (id, data['motif'], data.get('description', '')))
    conn.commit()
    envoyer_notification("signalement", "admin", 1, f"Signalement sur '{produit['nom_produit']}'", "/admin.html#signalements")
    log_action("signalement_produit", f"Produit ID: {id}", request.remote_addr)
    cur.close()
    conn.close()
    return jsonify({"status": "success", "message": "Signalement enregistré"}), 201

# ==========================================
# ADMIN
# ==========================================
@app.route('/admin/connexion', methods=['POST'])
def admin_connexion():
    data = request.get_json()
    if not data.get('email') or not data.get('mot_de_passe'):
        return jsonify({"message": "Email et mot de passe obligatoires"}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM admins WHERE email = %s", (data['email'],))
    admin = cur.fetchone()
    cur.close()
    conn.close()
    if not admin or not verifier_mot_de_passe(data['mot_de_passe'], admin['mot_de_passe']):
        return jsonify({"message": "Identifiants incorrects"}), 401
    token_jwt = generer_jwt(admin["id"], role='admin')
    csrf_token = generer_token_csrf()
    return jsonify({"message": "Connexion admin réussie", "token": token_jwt, "csrf_token": csrf_token})

@app.route('/admin/vendeurs', methods=['GET'])
def admin_vendeurs():
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM vendeurs ORDER BY date_creation DESC")
    vendeurs = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": vendeurs})

@app.route('/admin/vendeurs/<int:id>/valider', methods=['PUT'])
@require_csrf
def admin_valider_vendeur(id):
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    data = request.get_json()
    statut = data.get('statut')
    motif = data.get('motif', '')
    if statut not in ['valide', 'refuse']:
        return jsonify({"status": "error", "message": "Statut invalide"}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT nom FROM vendeurs WHERE id = %s", (id,))
    vendeur = cur.fetchone()
    cur.execute("UPDATE vendeurs SET statut = %s, motif_refus = %s WHERE id = %s", (statut, motif, id))
    conn.commit()
    if statut == 'valide':
        envoyer_notification("compte_valide", "vendeur", id, "Votre compte a été validé !", "/connexion.html")
    else:
        envoyer_notification("compte_refuse", "vendeur", id, f"Compte refusé. Motif: {motif}", None)
    log_action("admin_valider_vendeur", f"Vendeur ID: {id}, Statut: {statut}", request.remote_addr)
    cur.close()
    conn.close()
    return jsonify({"status": "success", "message": f"Vendeur {statut} avec succès"})

@app.route('/admin/produits', methods=['GET'])
def admin_produits():
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    filtre = request.args.get('filtre', 'recent')
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 30, type=int)
    offset = (page - 1) * limit
    conn = obtenir_connexion()
    cur = conn.cursor()
    requete = """
        SELECT p.*, v.nom_boutique, v.nom as nom_vendeur
        FROM produits p JOIN vendeurs v ON p.id_vendeur = v.id
    """
    if filtre == 'vues':
        requete += " ORDER BY p.vues DESC"
    elif filtre == 'ancien':
        requete += " ORDER BY p.date_creation ASC"
    else:
        requete += " ORDER BY p.date_creation DESC"
    count_requete = "SELECT COUNT(*) as total FROM (" + requete + ") as sous_requete"
    cur.execute(count_requete)
    total = cur.fetchone()['total']
    requete += " LIMIT %s OFFSET %s"
    cur.execute(requete, (limit, offset))
    produits = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "data": produits,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

@app.route('/admin/produits/<int:id>/valider', methods=['PUT'])
@require_csrf
def admin_valider_produit(id):
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    data = request.get_json()
    statut = data.get('statut')
    motif = data.get('motif', '')
    if statut not in ['valide', 'refuse']:
        return jsonify({"status": "error", "message": "Statut invalide"}), 400
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT nom_produit, id_vendeur FROM produits WHERE id = %s", (id,))
    produit = cur.fetchone()
    cur.execute("UPDATE produits SET statut = %s, motif_refus = %s WHERE id = %s", (statut, motif, id))
    conn.commit()
    if statut == 'valide':
        envoyer_notification("produit_valide", "vendeur", produit['id_vendeur'],
                            f"Votre produit '{produit['nom_produit']}' a été validé !", f"/produit.html?id={id}")
    else:
        envoyer_notification("produit_refuse", "vendeur", produit['id_vendeur'],
                            f"Produit '{produit['nom_produit']}' refusé. Motif: {motif}", "/dashboard.html#refuses")
    log_action("admin_valider_produit", f"Produit ID: {id}, Statut: {statut}", request.remote_addr)
    cur.close()
    conn.close()
    return jsonify({"status": "success", "message": f"Produit {statut} avec succès"})

@app.route('/admin/produits/<int:id>/publier', methods=['POST'])
@require_csrf
def admin_publier_produit(id):
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    data = request.get_json()
    plateforme = data.get('plateforme')
    message = data.get('message', '')
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM produits WHERE id = %s", (id,))
    produit = cur.fetchone()
    cur.close()
    conn.close()
    if not produit:
        return jsonify({"status": "error", "message": "Produit introuvable"}), 404
    if plateforme == 'whatsapp':
        url = f"https://wa.me/?text={message}"
    elif plateforme == 'facebook':
        url = f"https://www.facebook.com/sharer/sharer.php?u={message}"
    else:
        return jsonify({"status": "error", "message": "Plateforme non supportée"}), 400
    log_action("admin_publier_produit", f"Produit ID: {id}, Plateforme: {plateforme}", request.remote_addr)
    return jsonify({"status": "success", "message": "URL de partage générée", "url": url})

@app.route('/admin/stats', methods=['GET'])
def admin_stats():
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM produits")
    total_produits = cur.fetchone()['total']
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'en_attente'")
    produits_attente = cur.fetchone()['total']
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'valide'")
    produits_valides = cur.fetchone()['total']
    cur.execute("SELECT COUNT(*) as total FROM produits WHERE statut = 'refuse'")
    produits_refuses = cur.fetchone()['total']
    cur.execute("SELECT COUNT(*) as total FROM vendeurs")
    total_vendeurs = cur.fetchone()['total']
    cur.execute("SELECT COUNT(*) as total FROM vendeurs WHERE statut = 'en_attente'")
    vendeurs_attente = cur.fetchone()['total']
    cur.execute("SELECT SUM(vues) as total FROM produits")
    total_vues = cur.fetchone()['total'] or 0
    cur.execute("SELECT SUM(clic_whatsapp) as total FROM produits")
    total_clics = cur.fetchone()['total'] or 0
    cur.execute("SELECT COUNT(*) as total FROM signalements WHERE statut = 'en_attente'")
    signalements_attente = cur.fetchone()['total']
    cur.execute("""
        SELECT DATE_FORMAT(date_creation, '%Y-%m') as mois, SUM(vues) as vues
        FROM produits WHERE date_creation >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY mois ORDER BY mois ASC
    """)
    vues_mois = cur.fetchall()
    cur.execute("SELECT id, nom_produit, vues, prix, categorie FROM produits ORDER BY vues DESC LIMIT 5")
    top_produits = cur.fetchall()
    cur.execute("""
        SELECT v.id, v.nom, v.nom_boutique, COUNT(p.id) as nb_produits, SUM(p.vues) as total_vues
        FROM vendeurs v LEFT JOIN produits p ON v.id = p.id_vendeur
        GROUP BY v.id ORDER BY nb_produits DESC LIMIT 5
    """)
    top_vendeurs = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "data": {
            "total_produits": total_produits,
            "produits_attente": produits_attente,
            "produits_valides": produits_valides,
            "produits_refuses": produits_refuses,
            "total_vendeurs": total_vendeurs,
            "vendeurs_attente": vendeurs_attente,
            "total_vues": total_vues,
            "total_clics": total_clics,
            "signalements_attente": signalements_attente,
            "vues_mois": vues_mois,
            "top_produits": top_produits,
            "top_vendeurs": top_vendeurs
        }
    })

@app.route('/admin/logs', methods=['GET'])
def admin_logs():
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    offset = (page - 1) * limit
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as total FROM logs")
    total = cur.fetchone()['total']
    cur.execute("SELECT * FROM logs ORDER BY date_creation DESC LIMIT %s OFFSET %s", (limit, offset))
    logs = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({
        "status": "success",
        "data": logs,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit if total > 0 else 1}
    })

@app.route('/admin/notifications', methods=['GET'])
def admin_notifications():
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("SELECT * FROM notifications WHERE destinataire = 'admin' ORDER BY date_creation DESC LIMIT 50")
    notifications = cur.fetchall()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "data": notifications})

@app.route('/admin/notifications/<int:id>/lu', methods=['PUT'])
@require_csrf
def admin_notification_lu(id):
    if not get_admin_id(request.headers.get("Authorization")):
        return jsonify({"status": "error", "message": "Non autorisé"}), 403
    conn = obtenir_connexion()
    cur = conn.cursor()
    cur.execute("UPDATE notifications SET lu = TRUE WHERE id = %s", (id,))
    conn.commit()
    cur.close()
    conn.close()
    return jsonify({"status": "success", "message": "Notification marquée comme lue"})

# ==========================================
# LANCEMENT
# ==========================================
if __name__ == "__main__":
    os.makedirs('uploads', exist_ok=True)
    app.run(debug=False, host='0.0.0.0', port=5000)