const API = "";
let produitData = null;
let imageFile = null;

chargerDashboard();

async function chargerDashboard() {
    const token = localStorage.getItem("token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        setTimeout(() => window.location.href = "/connexion", 1500);
        return;
    }
    try {
        const reponse = await fetch(`${API}/vendeurs/me/dashboard`, {
            headers: { "Authorization": token }
        });
        if (reponse.status === 401) {
            localStorage.removeItem("token");
            afficherNotification("Session expirée", "error");
            setTimeout(() => window.location.href = "/connexion", 1500);
            return;
        }
        const data = await reponse.json();
        afficherDashboard(data);
    } catch (erreur) {
        console.error(erreur);
        afficherNotification("Erreur de chargement", "error");
    }
}

function afficherDashboard(data) {
    document.getElementById("nom-vendeur").innerHTML = data.vendeur.nom;
    document.getElementById("nom-boutique").innerHTML = data.vendeur.nom_boutique;
    const lienBoutique = document.getElementById("lien-ma-boutique");
    if (data.vendeur && data.vendeur.id) {
        lienBoutique.href = `/boutique?id=${data.vendeur.id}`;
        lienBoutique.style.display = "inline-block";
    } else {
        lienBoutique.style.display = "none";
    }
    document.getElementById("nb-produits").innerHTML = data.statistiques.total_produits || 0;
    document.getElementById("nb-vues").innerHTML = data.statistiques.total_vues || 0;
    document.getElementById("nb-clics").innerHTML = data.statistiques.total_clics || 0;

    const valides = data.produits.filter(p => p.statut !== 'refuse');
    const refuses = data.produits.filter(p => p.statut === 'refuse');
    afficherValides(valides);
    afficherRefuses(refuses);

    document.querySelectorAll(".tab-produit").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".tab-produit").forEach(b => {
                b.style.background = "#e2e8f0";
                b.style.color = "#1e293b";
            });
            this.style.background = "#0f766e";
            this.style.color = "white";
            const tab = this.dataset.tab;
            document.getElementById("mes-produits").style.display = tab === 'valides' ? 'block' : 'none';
            document.getElementById("mes-produits-refuses").style.display = tab === 'refuses' ? 'block' : 'none';
        });
    });
}

function afficherValides(produits) {
    const zone = document.getElementById("mes-produits");
    zone.innerHTML = "";
    if (!produits || produits.length === 0) {
        zone.innerHTML = `
            <div style="text-align:center; padding:40px; background:white; border-radius:12px; color:#64748b;">
                <p style="font-size:18px;">📦 Aucun produit pour le moment</p>
                <a href="/ajouter-produit" style="color:#0f766e; text-decoration:none; font-weight:600;">Ajouter votre premier produit</a>
            </div>
        `;
        return;
    }
    produits.forEach(p => {
        const image = p.image_url || "https://via.placeholder.com/100x100";
        const dateFr = new Date(p.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        let prixHtml = `<span class="prix">${new Intl.NumberFormat('fr-FR').format(p.prix)} FCFA</span>`;
        if (p.promotion && p.promotion > 0) {
            const prixOriginal = new Intl.NumberFormat('fr-FR').format(p.prix);
            const prixPromo = new Intl.NumberFormat('fr-FR').format(p.prix * (1 - p.promotion / 100));
            prixHtml = `
                <span style="text-decoration:line-through; color:#94a3b8; font-size:13px; margin-right:8px;">${prixOriginal} FCFA</span>
                <span class="prix">${prixPromo} FCFA</span>
                <span style="background:#dc2626; color:white; padding:2px 8px; border-radius:50px; font-size:11px; margin-left:6px;">-${p.promotion}%</span>
            `;
        }
        zone.innerHTML += `
            <div class="produit-dashboard">
                <div style="display:flex; align-items:center; gap:16px; flex:1; flex-wrap:wrap;">
                    <img src="${image}" alt="${p.nom_produit}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                    <div style="flex:2; min-width:140px;">
                        <h3 style="font-size:16px; margin:0; color:#064e3b;">${p.nom_produit}</h3>
                        <div style="margin:4px 0;">${prixHtml}</div>
                        <span style="display:inline-block; background:#fef3c7; color:#d97706; padding:2px 10px; border-radius:50px; font-size:12px;">${p.categorie || 'Non catégorisé'}</span>
                    </div>
                    <div style="text-align:center; min-width:80px;">
                        <p style="font-size:14px; margin:0;">👁 ${p.vues || 0}</p>
                        <p style="font-size:14px; margin:0;">💬 ${p.clic_whatsapp || 0}</p>
                    </div>
                    <div style="text-align:center; font-size:12px; color:#64748b; min-width:100px;">
                        <p style="margin:0;">📅 ${dateFr}</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <a href="/produit/${p.id}" target="_blank" style="background:#0f766e; color:white; text-decoration:none; padding:6px 16px; border-radius:50px; font-size:13px; font-weight:600;">Voir plus</a>
                    <button onclick="modifierProduit(${p.id})" style="background:#2563eb; color:white; border:none; padding:6px 14px; border-radius:50px; cursor:pointer;">Modifier</button>
                    <button onclick="supprimerProduit(${p.id})" style="background:#dc2626; color:white; border:none; padding:6px 14px; border-radius:50px; cursor:pointer;">Supprimer</button>
                    <button onclick="ouvrirModalPublicationVendeur(${p.id}, '${p.nom_produit}', ${p.prix}, '${p.categorie}', '${p.image_url || ''}')" 
                            style="background:#25D366; color:white; border:none; padding:6px 14px; border-radius:50px; cursor:pointer; font-weight:600;">
                        📢 Publier
                    </button>
                </div>
            </div>
        `;
    });
}

function afficherRefuses(produits) {
    const zone = document.getElementById("mes-produits-refuses");
    zone.innerHTML = "";
    if (!produits || produits.length === 0) {
        zone.innerHTML = `<div style="text-align:center; padding:40px; background:white; border-radius:12px; color:#64748b;"><p>✅ Aucun produit refusé</p></div>`;
        return;
    }
    produits.forEach(p => {
        const motif = p.motif_refus || "Aucun motif fourni";
        zone.innerHTML += `
            <div class="produit-dashboard refuse">
                <div style="display:flex; align-items:center; gap:16px; flex:1; flex-wrap:wrap;">
                    <img src="${p.image_url || 'https://via.placeholder.com/100x100'}" style="width:60px; height:60px; object-fit:cover; border-radius:8px;">
                    <div style="flex:2; min-width:140px;">
                        <h3 style="font-size:16px; margin:0; color:#064e3b;">${p.nom_produit}</h3>
                        <p style="color:#dc2626; font-weight:600; margin:4px 0;">❌ Refusé</p>
                        <p style="font-size:13px; color:#64748b;">Motif : ${motif}</p>
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button onclick="modifierProduit(${p.id})" style="background:#2563eb; color:white; border:none; padding:6px 14px; border-radius:50px; cursor:pointer;">Modifier</button>
                    <button onclick="supprimerProduit(${p.id})" style="background:#dc2626; color:white; border:none; padding:6px 14px; border-radius:50px; cursor:pointer;">Supprimer</button>
                </div>
            </div>
        `;
    });
}

function modifierProduit(id) {
    window.location.href = `/modifier-produit?id=${id}`;
}

async function supprimerProduit(id) {
    const ok = await confirmerAction("⚠️ Suppression du produit", "Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.");
    if (!ok) return;
    const token = localStorage.getItem("token");
    const csrf_token = localStorage.getItem("csrf_token");
    try {
        const reponse = await fetch(`${API}/produits/${id}`, {
            method: "DELETE",
            headers: { "Authorization": token, "X-CSRF-Token": csrf_token }
        });
        const data = await reponse.json();
        if (reponse.status === 200) {
            afficherNotification("✅ " + data.message, "success");
            chargerDashboard();
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("Erreur lors de la suppression", "error");
    }
}

async function supprimerCompte() {
    const ok = await confirmerAction("⚠️ Suppression du compte", "Voulez-vous vraiment supprimer votre compte ? Tous vos produits seront supprimés définitivement.");
    if (!ok) return;
    const token = localStorage.getItem("token");
    const csrf_token = localStorage.getItem("csrf_token");
    try {
        const reponse = await fetch(`${API}/vendeurs/me/supprimer`, {
            method: "DELETE",
            headers: { "Authorization": token, "X-CSRF-Token": csrf_token }
        });
        const data = await reponse.json();
        if (reponse.status === 200) {
            afficherNotification("✅ " + data.message, "success");
            localStorage.clear();
            window.location.href = "/connexion";
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("Erreur lors de la suppression", "error");
    }
}

function deconnexion() {
    localStorage.removeItem("token");
    localStorage.removeItem("csrf_token");
    afficherNotification("Déconnexion réussie", "success");
    setTimeout(() => window.location.href = "/connexion", 300);
}

// ============================================
// PUBLICATION AVEC IMAGE BRUTE + MESSAGE PRÉ-REMPLI (vendeur)
// ============================================

function ouvrirModalPublicationVendeur(id, nom, prix, categorie, image) {
    const token = localStorage.getItem("token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        window.location.href = "/connexion";
        return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'modal-publication-vendeur';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px 32px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        animation: slideUp 0.3s ease;
    `;

    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h3 style="color:#064e3b;margin:0;">📢 Préparation...</h3>
            <button onclick="fermerModalPublicationVendeur()" style="background:transparent;border:none;font-size:24px;cursor:pointer;">✕</button>
        </div>
        <div style="text-align:center;padding:20px;">
            <div class="spinner" style="border:4px solid #e2e8f0;border-top-color:#0f766e;border-radius:50%;width:40px;height:40px;animation:spin 0.8s linear infinite;margin:0 auto;"></div>
            <p style="color:#64748b;margin-top:12px;">Chargement des données...</p>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    (async () => {
        try {
            const reponse = await fetch(`${API}/produits/${id}`);
            const data = await reponse.json();
            produitData = data.data;

            const imageUrl = produitData.image_url;
            if (imageUrl) {
                const imgReponse = await fetch(imageUrl);
                const blob = await imgReponse.blob();
                const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
                imageFile = new File([blob], `produit_${id}.${ext}`, { type: blob.type || 'image/jpeg' });
            } else {
                imageFile = null;
            }

            const prixFormate = new Intl.NumberFormat('fr-FR').format(produitData.prix);
            const lien = `${window.location.origin}/produit/${id}`;
            const imageUrlDisplay = produitData.image_url || '';

            modal.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="color:#064e3b;margin:0;">📢 Publier votre produit</h3>
                    <button onclick="fermerModalPublicationVendeur()" style="background:transparent;border:none;font-size:24px;cursor:pointer;">✕</button>
                </div>
                ${imageUrlDisplay ? `<img src="${imageUrlDisplay}" style="width:100%;max-height:200px;object-fit:cover;border-radius:8px;margin-bottom:12px;">` : '<p style="color:#dc2626;">⚠️ Aucune image</p>'}
                <div style="background:#f8fafc;padding:12px;border-radius:8px;margin-bottom:16px;">
                    <p style="margin:0;font-weight:600;">${produitData.nom_produit}</p>
                    <p style="margin:4px 0;color:#0f766e;font-weight:600;">${prixFormate} FCFA</p>
                    <p style="margin:0;font-size:13px;color:#64748b;">🏷️ ${produitData.categorie}</p>
                    <p style="margin:0;font-size:13px;color:#64748b;">🔗 ${lien}</p>
                </div>

                <label style="font-weight:600;display:block;margin-bottom:4px;">Plateforme</label>
                <select id="plateforme-publier-vendeur" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;margin-bottom:12px;">
                    <option value="whatsapp">📱 WhatsApp</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="twitter">🐦 Twitter/X</option>
                </select>

                <label style="font-weight:600;display:block;margin-bottom:4px;">Message personnalisé (sans le lien)</label>
                <textarea id="message-publier-vendeur" style="width:100%;padding:10px;border:2px solid #e2e8f0;border-radius:8px;min-height:80px;margin-bottom:12px;font-family:inherit;">🔥 Découvrez ${produitData.nom_produit} sur Leyamo !\n💰 ${prixFormate} FCFA\n🏷️ ${produitData.categorie}</textarea>

                <p style="font-size:13px;color:#64748b;margin:-8px 0 12px;">🔗 Le lien sera ajouté automatiquement à la fin.</p>

                <div style="display:flex;gap:10px;">
                    <button onclick="publierDepuisModalVendeur(${id})" style="flex:1;background:#25D366;color:white;border:none;padding:12px;border-radius:50px;font-weight:600;cursor:pointer;">📤 Publier</button>
                    <button onclick="fermerModalPublicationVendeur()" style="flex:1;background:#e2e8f0;color:#1e293b;border:none;padding:12px;border-radius:50px;font-weight:600;cursor:pointer;">Annuler</button>
                </div>
                <div id="resultat-publication-vendeur" style="margin-top:12px;text-align:center;"></div>
            `;
        } catch (e) {
            modal.innerHTML = `<p style="color:#dc2626;">❌ Erreur de chargement : ${e.message}</p>`;
            afficherNotification("Erreur de préchargement", "error");
        }
    })();
}

function fermerModalPublicationVendeur() {
    const modal = document.getElementById('modal-publication-vendeur');
    if (modal) modal.remove();
    produitData = null;
    imageFile = null;
}

async function publierDepuisModalVendeur(produitId) {
    const token = localStorage.getItem("token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        return;
    }

    const plateforme = document.getElementById('plateforme-publier-vendeur').value;
    const messagePerso = document.getElementById('message-publier-vendeur').value.trim();
    const resultatDiv = document.getElementById('resultat-publication-vendeur');

    if (!produitData) {
        resultatDiv.innerHTML = '<span style="color:#dc2626;">⏳ Veuillez attendre le chargement complet.</span>';
        return;
    }

    const nom = produitData.nom_produit;
    const prix = new Intl.NumberFormat('fr-FR').format(produitData.prix);
    const lien = `${window.location.origin}/produit/${produitId}`;
    let message = messagePerso;
    if (!message) {
        message = `🔥 Découvrez ${nom} sur Leyamo !\n💰 ${prix} FCFA\n🏷️ ${produitData.categorie}`;
    }
    message += `\n🔗 ${lien}`;

    if (!imageFile) {
        if (navigator.share) {
            try {
                await navigator.share({ title: nom, text: message });
                afficherNotification("✅ Partagé (sans image)", "success");
                resultatDiv.innerHTML = `<span style="color:#16a34a;">✅ Partagé sur ${plateforme}</span>`;
                setTimeout(() => fermerModalPublicationVendeur(), 1500);
            } catch (err) {
                if (err.name !== 'AbortError') {
                    afficherNotification("❌ Échec du partage", "error");
                    resultatDiv.innerHTML = `<span style="color:#dc2626;">❌ ${err.message}</span>`;
                }
            }
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            resultatDiv.innerHTML = `<span style="color:#f59e0b;">📤 Message WhatsApp ouvert</span>`;
            afficherNotification("📤 WhatsApp ouvert", "info");
        }
        return;
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: nom,
                text: message,
                files: [imageFile]
            });
            afficherNotification("✅ Partagé avec succès !", "success");
            resultatDiv.innerHTML = `<span style="color:#16a34a;">✅ Partagé sur ${plateforme}</span>`;
            setTimeout(() => fermerModalPublicationVendeur(), 1500);
        } catch (err) {
            if (err.name !== 'AbortError') {
                afficherNotification("❌ Échec du partage", "error");
                resultatDiv.innerHTML = `<span style="color:#dc2626;">❌ ${err.message}</span>`;
            }
        }
    } else {
        const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(urlWhatsApp, '_blank');
        window.open(produitData.image_url, '_blank');
        resultatDiv.innerHTML = `
            <span style="color:#f59e0b;">⚠️ Votre navigateur ne permet pas le partage direct d'image.<br>
            L'image s'ouvre dans un nouvel onglet. Téléchargez-la et envoyez-la dans WhatsApp avec le message.</span>
        `;
        afficherNotification("📤 Message WhatsApp ouvert, téléchargez l'image", "info");
    }
}

// Expositions globales
window.modifierProduit = modifierProduit;
window.supprimerProduit = supprimerProduit;
window.supprimerCompte = supprimerCompte;
window.deconnexion = deconnexion;
window.ouvrirModalPublicationVendeur = ouvrirModalPublicationVendeur;
window.fermerModalPublicationVendeur = fermerModalPublicationVendeur;
window.publierDepuisModalVendeur = publierDepuisModalVendeur;