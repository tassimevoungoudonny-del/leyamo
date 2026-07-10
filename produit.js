// ============================================
// PRODUIT.JS – Version ultime (retour fiable)
// ============================================

const API = "";
const id = window.location.pathname.split('/').pop();

// ============================================
// 1. Gestion robuste du retour arrière (touche physique)
// ============================================
(function() {
    // Vérifier si l'utilisateur vient de l'extérieur (pas de referer interne)
    const referer = document.referrer || '';
    const isExternal = !referer || !referer.includes(window.location.origin);

    if (isExternal) {
        // Créer un historique à deux entrées : accueil → produit
        history.replaceState({ page: 'home' }, '', '/');
        history.pushState({ page: 'product' }, '', window.location.pathname);
    }

    // Intercepter popstate (touche Retour classique)
    window.addEventListener('popstate', function(event) {
        if (event.state && event.state.page === 'home') {
            window.location.replace('/');
        } else if (!event.state) {
            window.location.replace('/');
        }
    });

    // Détecter le retour via pageshow (bfcache)
    window.addEventListener('pageshow', function(event) {
        // Si la page est chargée depuis la bfcache, c'est un retour
        if (event.persisted) {
            window.location.replace('/');
        }
    });

    // Fallback pour les navigateurs qui ne déclenchent ni popstate ni pageshow correctement
    // On utilise un compteur pour détecter si l'utilisateur est resté sur la page
    // (Solution alternative : utiliser un cookie ou sessionStorage)
    // On va simplement s'assurer que l'historique est bien modifié et qu'une sortie
    // propre est effectuée en cas de fermeture de l'application.
    // Rien de plus fiable.

    // Petit hack : sur certains appareils, la touche retour peut aussi déclencher un événement "beforeunload"
    // On pourrait rediriger vers l'accueil lors de la fermeture, mais ce n'est pas souhaitable.
})();

// ============================================
// 2. Chargement des avis
// ============================================

document.addEventListener("DOMContentLoaded", function() {
    chargerAvis(id);
});

async function chargerAvis(produitId) {
    try {
        const reponse = await fetch(`${API}/produits/${produitId}/avis`);
        if (!reponse.ok) {
            throw new Error(`HTTP ${reponse.status}`);
        }
        const data = await reponse.json();

        let section = document.getElementById("avis-section");
        if (!section) {
            section = document.createElement("div");
            section.id = "avis-section";
            section.className = "avis-section";
            const fiche = document.querySelector(".fiche-produit");
            if (fiche) fiche.appendChild(section);
        }

        const moyenne = (typeof data.moyenne === 'number') ? data.moyenne : 0;
        const total = data.total || 0;
        const etoiles = "⭐".repeat(Math.round(moyenne)) + "☆".repeat(5 - Math.round(moyenne));

        section.innerHTML = `
            <h3>📝 Avis</h3>
            <div class="avis-moyenne">
                <span class="note">${moyenne ? moyenne.toFixed(1) : '0'}</span>
                <span class="etoiles">${etoiles}</span>
                <span style="color:#64748b;">(${total} avis)</span>
            </div>
            <div id="liste-avis">
                ${data.data.map(a => `
                    <div class="avis-item">
                        <div>
                            <span class="avis-nom">${a.client_nom || 'Anonyme'}</span>
                            <span class="avis-note">${"⭐".repeat(a.note)}</span>
                            <span class="avis-date">${new Date(a.date_creation).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <div class="avis-commentaire">${a.commentaire || ''}</div>
                    </div>
                `).join('')}
            </div>
            <div class="avis-form">
                <h4>Donnez votre avis</h4>
                <input type="text" id="avis-nom" placeholder="Votre nom" style="width:100%;padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;margin-bottom:8px;">
                <select id="avis-note" style="padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;">
                    <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                    <option value="4">⭐⭐⭐⭐ (4)</option>
                    <option value="3">⭐⭐⭐ (3)</option>
                    <option value="2">⭐⭐ (2)</option>
                    <option value="1">⭐ (1)</option>
                </select>
                <textarea id="avis-commentaire" placeholder="Votre commentaire..." style="width:100%;padding:8px 12px;border:2px solid #e2e8f0;border-radius:8px;margin:8px 0;min-height:60px;"></textarea>
                <button onclick="ajouterAvis(${produitId})" style="background:#0f766e;color:white;border:none;padding:8px 20px;border-radius:50px;cursor:pointer;font-weight:600;">Envoyer</button>
            </div>
        `;
    } catch (e) {
        console.error("Erreur avis", e);
        const section = document.getElementById("avis-section");
        if (section) {
            section.innerHTML = "<p style='color:#dc2626;'>❌ Erreur de chargement des avis. Veuillez réessayer.</p>";
        }
    }
}

async function ajouterAvis(produitId) {
    const client_nom = document.getElementById("avis-nom").value.trim() || "Anonyme";
    const note = parseInt(document.getElementById("avis-note").value);
    const commentaire = document.getElementById("avis-commentaire").value.trim();
    try {
        const reponse = await fetch(`${API}/produits/${produitId}/avis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_nom, note, commentaire })
        });
        const data = await reponse.json();
        if (reponse.status === 201) {
            afficherNotification("✅ Avis ajouté", "success");
            chargerAvis(produitId);
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (e) {
        afficherNotification("❌ Erreur réseau", "error");
    }
}

// ============================================
// 3. Lightbox sur l'image principale
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const img = document.getElementById('image-principale');
    if (img) {
        img.style.cursor = 'pointer';
        img.addEventListener('click', function() {
            if (typeof ouvrirLightbox === 'function') {
                ouvrirLightbox(this.src);
            } else {
                window.open(this.src, '_blank');
            }
        });
    }
});

// ============================================
// 4. Enregistrement du clic WhatsApp
// ============================================

document.addEventListener("click", function(e) {
    if (e.target.id === "btn-whatsapp") {
        const id = window.location.pathname.split('/').pop();
        fetch(`${API}/produits/${id}/whatsapp`, { method: "POST" }).catch(() => {});
    }
});

// ============================================
// 5. Exposition globale des fonctions
// ============================================

window.ajouterAvis = ajouterAvis;
window.chargerAvis = chargerAvis;