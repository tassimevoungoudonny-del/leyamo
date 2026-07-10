// ============================================
// PRODUIT.JS – Gestion de la page produit
// ============================================

const API = "";
const id = window.location.pathname.split('/').pop();

// ============================================
// 1. Gestion du retour arrière (touche physique)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Vérifier si l'utilisateur vient de l'extérieur (pas de referer interne)
    const referer = document.referrer || '';
    const isExternal = !referer || !referer.includes(window.location.origin);

    // Si on arrive directement (WhatsApp, lien externe)
    if (isExternal) {
        // Remplacer l'état actuel par l'accueil
        history.replaceState({ page: 'home' }, '', '/');
        // Pousser l'état du produit
        history.pushState({ page: 'product' }, '', window.location.pathname);
    }

    // Écouter la touche Retour (et le geste)
    window.addEventListener('popstate', function(event) {
        // Si l'état précédent est 'home', on redirige vers l'accueil
        if (event.state && event.state.page === 'home') {
            window.location.href = '/';
        }
        // Sinon, on laisse le navigateur faire son comportement normal
    });
});

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