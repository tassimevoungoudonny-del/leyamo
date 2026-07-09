const API = "";
const id = window.location.pathname.split('/').pop();

document.addEventListener("DOMContentLoaded", function() {
    chargerAvis(id);
});

async function chargerAvis(produitId) {
    try {
        const reponse = await fetch(`${API}/produits/${produitId}/avis`);
        const data = await reponse.json();
        let section = document.getElementById("avis-section");
        
        // Si la section n'existe pas, on la crée
        if (!section) {
            section = document.createElement("div");
            section.id = "avis-section";
            section.className = "avis-section";
            const fiche = document.querySelector(".fiche-produit");
            if (fiche) fiche.appendChild(section);
        }

        const etoiles = "⭐".repeat(Math.round(data.moyenne || 0)) + "☆".repeat(5 - Math.round(data.moyenne || 0));

        section.innerHTML = `
            <h3>📝 Avis</h3>
            <div class="avis-moyenne">
                <span class="note">${data.moyenne ? data.moyenne.toFixed(1) : '0'}</span>
                <span class="etoiles">${etoiles}</span>
                <span style="color:#64748b;">(${data.total || 0} avis)</span>
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
        if (section) section.innerHTML = "<p style='color:#dc2626;'>Erreur de chargement des avis</p>";
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
        afficherNotification("Erreur réseau", "error");
    }
}

// Rendre l'image principale cliquable pour l'agrandir
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

// Enregistrer le clic WhatsApp
document.addEventListener("click", function(e) {
    if (e.target.id === "btn-whatsapp") {
        const id = window.location.pathname.split('/').pop();
        fetch(`${API}/produits/${id}/whatsapp`, { method: "POST" }).catch(() => {});
    }
});