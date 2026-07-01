const API = "";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
chargerProduit();

async function chargerProduit() {
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const p = data.data;
        document.getElementById("nom").innerHTML = p.nom_produit;

        // Prix formaté avec promotion
        const prixFormate = new Intl.NumberFormat('fr-FR').format(p.prix);
        const promotion = p.promotion || 0;
        let prixHtml = `${prixFormate} FCFA`;
        if (promotion > 0) {
            const prixPromo = new Intl.NumberFormat('fr-FR').format(p.prix * (1 - promotion / 100));
            prixHtml = `
                <span class="prix-barre">${prixFormate} FCFA</span>
                <span class="prix">${prixPromo} FCFA</span>
                <span class="badge-promo">-${promotion}%</span>
            `;
        }
        document.getElementById("prix").innerHTML = prixHtml;

        document.getElementById("categorie").innerHTML = p.categorie;
        document.getElementById("description").innerHTML = p.description_produit;
        document.getElementById("lieu").innerHTML = p.localisation_detaillee || p.localisation_boutique || "Non renseigné";
        document.getElementById("vues").innerHTML = `👁 ${p.vues || 0} vues`;

        // Boutique
        const boutiqueNom = p.nom_boutique || "Boutique";
        document.getElementById("nom-boutique").innerHTML = boutiqueNom;
        const lienBoutique = document.getElementById("lien-boutique");
        if (p.id_vendeur) {
            lienBoutique.href = `boutique.html?id=${p.id_vendeur}`;
            lienBoutique.style.display = "inline";
        } else {
            lienBoutique.style.display = "none";
        }

        // Galerie
        const images = p.images || [];
        const principale = document.getElementById("image-principale");
        const miniaturesDiv = document.getElementById("miniatures");
        miniaturesDiv.innerHTML = "";
        if (images.length > 0) {
            principale.src = images[0];
            images.forEach((url, idx) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = idx === 0 ? "active" : "";
                img.addEventListener("click", function() {
                    principale.src = url;
                    document.querySelectorAll("#miniatures img").forEach(i => i.className = "");
                    this.className = "active";
                });
                miniaturesDiv.appendChild(img);
            });
        } else {
            principale.src = "https://via.placeholder.com/800x400";
        }

        // WhatsApp
        document.getElementById("btn-whatsapp").onclick = () => {
            enregistrerClic();
            window.open(`https://wa.me/237${p.num_whatsapp}?text=${encodeURIComponent(`Bonjour, intéressé par ${p.nom_produit}`)}`, "_blank");
        };

        // Avis
        chargerAvis(id);

    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

async function enregistrerClic() {
    try { await fetch(`${API}/produits/${id}/whatsapp`, { method: "POST" }); } catch (e) {}
}

// ============================================
// PARTAGE SOCIAL
// ============================================
function partagerWhatsApp() {
    const url = encodeURIComponent(window.location.href);
    const texte = encodeURIComponent(`🔥 Découvrez ce produit sur Leyamo !\n\n${document.getElementById("nom").textContent}\n💰 ${document.getElementById("prix").textContent}`);
    window.open(`https://wa.me/?text=${texte}%0A🔗 ${url}`, "_blank");
}

function partagerFacebook() {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
}

function copierLien() {
    navigator.clipboard.writeText(window.location.href).then(() => {
        afficherNotification("✅ Lien copié !", "success");
    }).catch(() => {
        afficherNotification("❌ Erreur", "error");
    });
}

// ============================================
// AVIS
// ============================================
async function chargerAvis(produitId) {
    try {
        const reponse = await fetch(`${API}/produits/${produitId}/avis`);
        const data = await reponse.json();
        const section = document.getElementById("avis-section");
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
                <textarea id="avis-commentaire" placeholder="Votre commentaire..."></textarea>
                <button onclick="ajouterAvis(${produitId})">Envoyer</button>
            </div>
        `;
    } catch (e) {}
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
        afficherNotification("Erreur", "error");
    }
}