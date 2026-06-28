const API = "http://127.0.0.1:5000";

chargerDashboard();

async function chargerDashboard() {
    const token = localStorage.getItem("token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        setTimeout(() => { window.location.href = "connexion.html"; }, 1500);
        return;
    }
    try {
        const reponse = await fetch(`${API}/vendeurs/me/dashboard`, {
            headers: { "Authorization": token }
        });
        if (reponse.status === 401) {
            localStorage.removeItem("token");
            setTimeout(() => { window.location.href = "connexion.html"; }, 1500);
            return;
        }
        const data = await reponse.json();
        afficherDashboard(data);
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

function afficherDashboard(data) {
    document.getElementById("nom-vendeur").innerHTML = data.vendeur.nom;
    document.getElementById("nom-boutique").innerHTML = data.vendeur.nom_boutique;
    document.getElementById("nb-produits").innerHTML = data.statistiques.total_produits || 0;
    document.getElementById("nb-vues").innerHTML = data.statistiques.total_vues || 0;
    document.getElementById("nb-clics").innerHTML = data.statistiques.total_clics || 0;

    const valides = data.produits.filter(p => p.statut !== 'refuse');
    const refuses = data.produits.filter(p => p.statut === 'refuse');
    afficherValides(valides);
    afficherRefuses(refuses);

    document.querySelectorAll(".tab-produit").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".tab-produit").forEach(b => { b.style.background = "#e2e8f0"; b.style.color = "#1e293b"; });
            this.style.background = "#0f766e"; this.style.color = "white";
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
        zone.innerHTML = `<div style="text-align:center;padding:40px;background:white;border-radius:12px;color:#64748b;"><p>📦 Aucun produit</p><a href="ajouter-produit.html" style="color:#0f766e;text-decoration:none;font-weight:600;">Ajouter un produit</a></div>`;
        return;
    }
    produits.forEach(p => {
        const image = p.image_url || "https://via.placeholder.com/100x100";
        const dateFr = new Date(p.date_creation).toLocaleDateString('fr-FR');
        zone.innerHTML += `
            <div class="produit-dashboard">
                <div style="display:flex;align-items:center;gap:16px;flex:1;flex-wrap:wrap;">
                    <img src="${image}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
                    <div style="flex:2;min-width:140px;">
                        <h3 style="font-size:16px;margin:0;color:#064e3b;">${p.nom_produit}</h3>
                        <p style="color:#0f766e;font-weight:600;margin:4px 0;">${p.prix} FCFA</p>
                        <span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:50px;font-size:12px;">${p.categorie}</span>
                    </div>
                    <div style="text-align:center;min-width:80px;"><p style="font-size:14px;margin:0;">👁 ${p.vues || 0}</p><p style="font-size:14px;margin:0;">💬 ${p.clic_whatsapp || 0}</p></div>
                    <div style="text-align:center;font-size:12px;color:#64748b;min-width:100px;"><p>📅 ${dateFr}</p></div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <a href="produit.html?id=${p.id}" target="_blank" style="background:#0f766e;color:white;text-decoration:none;padding:6px 16px;border-radius:50px;font-size:13px;font-weight:600;">Voir plus</a>
                    <button onclick="modifierProduit(${p.id})" style="background:#2563eb;color:white;border:none;padding:6px 14px;border-radius:50px;cursor:pointer;">Modifier</button>
                    <button onclick="supprimerProduit(${p.id})" style="background:#dc2626;color:white;border:none;padding:6px 14px;border-radius:50px;cursor:pointer;">Supprimer</button>
                </div>
            </div>
        `;
    });
}

function afficherRefuses(produits) {
    const zone = document.getElementById("mes-produits-refuses");
    zone.innerHTML = "";
    if (!produits || produits.length === 0) {
        zone.innerHTML = `<div style="text-align:center;padding:40px;background:white;border-radius:12px;color:#64748b;"><p>✅ Aucun produit refusé</p></div>`;
        return;
    }
    produits.forEach(p => {
        zone.innerHTML += `
            <div class="produit-dashboard refuse">
                <div style="display:flex;align-items:center;gap:16px;flex:1;flex-wrap:wrap;">
                    <img src="${p.image_url || 'https://via.placeholder.com/100x100'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
                    <div style="flex:2;min-width:140px;">
                        <h3 style="font-size:16px;margin:0;color:#064e3b;">${p.nom_produit}</h3>
                        <p style="color:#dc2626;font-weight:600;margin:4px 0;">❌ Refusé</p>
                        <p style="font-size:13px;color:#64748b;">Motif : ${p.motif_refus || 'Aucun motif'}</p>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="modifierProduit(${p.id})" style="background:#2563eb;color:white;border:none;padding:6px 14px;border-radius:50px;cursor:pointer;">Modifier</button>
                    <button onclick="supprimerProduit(${p.id})" style="background:#dc2626;color:white;border:none;padding:6px 14px;border-radius:50px;cursor:pointer;">Supprimer</button>
                </div>
            </div>
        `;
    });
}

function deconnexion() {
    localStorage.removeItem("token");
    localStorage.removeItem("csrf_token");
    afficherNotification("Déconnexion réussie", "success");
    setTimeout(() => { window.location.href = "connexion.html"; }, 300);
}

function modifierProduit(id) { window.location.href = `modifier-produit.html?id=${id}`; }

async function supprimerProduit(id) {
    if (!confirm("⚠️ Supprimer ce produit ?")) return;
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
    if (!confirm("⚠️ Voulez-vous vraiment supprimer votre compte ? Tous vos produits seront supprimés.")) return;
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
            window.location.href = "connexion.html";
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("Erreur lors de la suppression", "error");
    }
}

window.modifierProduit = modifierProduit;
window.supprimerProduit = supprimerProduit;
window.deconnexion = deconnexion;
window.supprimerCompte = supprimerCompte;