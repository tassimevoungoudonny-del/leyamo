const API = "";
const token = localStorage.getItem("token");
const csrf_token = localStorage.getItem("csrf_token");

if (!token) { window.location.href = "admin-connexion.html"; }

let filtreActuel = 'recent', logsPage = 1;

chargerAdmin();

async function chargerAdmin() {
    await chargerStats();
    await chargerVendeurs();
    await chargerProduits(filtreActuel);
    await chargerSignalements();
}

// ---------- STATS ----------
async function chargerStats() {
    try {
        const reponse = await fetch(`${API}/admin/stats`, { headers: { "Authorization": token } });
        const data = await reponse.json();
        if (data.status === 'success') {
            const s = data.data;
            document.getElementById("stat-total-produits").innerHTML = s.total_produits || 0;
            document.getElementById("stat-produits-attente").innerHTML = s.produits_attente || 0;
            document.getElementById("stat-produits-valides").innerHTML = s.produits_valides || 0;
            document.getElementById("stat-produits-refuses").innerHTML = s.produits_refuses || 0;
            document.getElementById("stat-total-vendeurs").innerHTML = s.total_vendeurs || 0;
            document.getElementById("stat-vendeurs-attente").innerHTML = s.vendeurs_attente || 0;
            document.getElementById("stat-total-vues").innerHTML = s.total_vues || 0;
            document.getElementById("stat-total-clics").innerHTML = s.total_clics || 0;
            document.getElementById("stat-signalements").innerHTML = s.signalements_attente || 0;
            afficherGraphique(s.vues_mois);
            afficherTopProduits(s.top_produits);
            afficherTopVendeurs(s.top_vendeurs);
        }
    } catch (e) { afficherNotification("Erreur stats", "error"); }
}

function afficherGraphique(vuesMois) {
    const c = document.getElementById("graphique-vues");
    c.innerHTML = "";
    if (!vuesMois || vuesMois.length === 0) { c.innerHTML = "<p style='color:#64748b;'>Aucune donnée</p>"; return; }
    const max = Math.max(...vuesMois.map(i => i.vues), 1);
    vuesMois.forEach(item => {
        const h = Math.round((item.vues / max) * 180);
        const mois = item.mois.split('-')[1] + '/' + item.mois.split('-')[0].slice(2);
        const div = document.createElement("div");
        div.style.cssText = "display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;";
        div.innerHTML = `<div style="width:100%;max-width:40px;height:${h}px;background:#0f766e;border-radius:6px 6px 0 0;transition:height 0.5s;min-height:4px;"></div><span style="font-size:11px;color:#64748b;">${mois}</span><span style="font-size:10px;color:#0f766e;font-weight:600;">${item.vues}</span>`;
        c.appendChild(div);
    });
}

function afficherTopProduits(produits) {
    const c = document.getElementById("top-produits");
    c.innerHTML = "";
    if (!produits || produits.length === 0) { c.innerHTML = "<p style='color:#64748b;'>Aucun produit</p>"; return; }
    produits.forEach((p, i) => {
        c.innerHTML += `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-weight:700;color:#0f766e;min-width:24px;">${i+1}</span><div style="flex:1;"><strong>${p.nom_produit}</strong><p style="font-size:12px;color:#64748b;">${p.prix} FCFA</p></div><span style="background:#ecfdf5;color:#0f766e;padding:2px 12px;border-radius:50px;font-size:12px;">👁 ${p.vues}</span></div>`;
    });
}

function afficherTopVendeurs(vendeurs) {
    const c = document.getElementById("top-vendeurs");
    c.innerHTML = "";
    if (!vendeurs || vendeurs.length === 0) { c.innerHTML = "<p style='color:#64748b;'>Aucun vendeur</p>"; return; }
    vendeurs.forEach((v, i) => {
        c.innerHTML += `<div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;"><span style="font-weight:700;color:#2563eb;min-width:24px;">${i+1}</span><div style="flex:1;"><strong>${v.nom}</strong><p style="font-size:12px;color:#64748b;">${v.nom_boutique || 'Boutique'}</p></div><div style="text-align:right;"><span style="font-size:13px;font-weight:600;color:#0f766e;">${v.nb_produits||0} produits</span></div></div>`;
    });
}

// ---------- VENDEURS ----------
async function chargerVendeurs() {
    try {
        const reponse = await fetch(`${API}/admin/vendeurs`, { headers: { "Authorization": token } });
        const data = await reponse.json();
        afficherVendeurs(data.data);
    } catch (e) { afficherNotification("Erreur vendeurs", "error"); }
}

function afficherVendeurs(vendeurs) {
    const c = document.getElementById("liste-vendeurs");
    c.innerHTML = "";
    if (!vendeurs || vendeurs.length === 0) { c.innerHTML = "<p>Aucun vendeur</p>"; return; }
    vendeurs.forEach(v => {
        const stat = { 'valide': '#16a34a', 'refuse': '#dc2626', 'en_attente': '#f59e0b' };
        const texte = { 'valide': '✅ Validé', 'refuse': '❌ Refusé', 'en_attente': '⏳ En attente' };
        const bg = stat[v.statut] || '#f59e0b';
        c.innerHTML += `
            <div style="background:white;padding:16px 20px;border-radius:12px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="flex:2;min-width:150px;">
                    <strong>${v.nom}</strong>
                    <p style="color:#64748b;font-size:14px;">${v.email}</p>
                    <p style="font-size:13px;">🏪 ${v.nom_boutique || 'Non renseigné'}</p>
                    <p style="font-size:13px;">📍 ${v.localisation_boutique || 'Non renseigné'}</p>
                    ${v.localisation_detaillee ? `<p style="font-size:12px;color:#64748b;">📍 ${v.localisation_detaillee}</p>` : ''}
                </div>
                <div><span style="background:${bg};color:white;padding:4px 14px;border-radius:50px;font-size:13px;font-weight:600;">${texte[v.statut] || '⏳ En attente'}</span>${v.motif_refus ? `<p style="font-size:12px;color:#dc2626;">Motif: ${v.motif_refus}</p>` : ''}</div>
                <div style="display:flex;gap:8px;">
                    ${v.statut !== 'valide' ? `<button onclick="validerVendeur(${v.id},'valide')" style="background:#16a34a;color:white;border:none;padding:6px 16px;border-radius:50px;cursor:pointer;">✅ Valider</button>` : ''}
                    ${v.statut !== 'refuse' ? `<button onclick="refuserVendeur(${v.id})" style="background:#dc2626;color:white;border:none;padding:6px 16px;border-radius:50px;cursor:pointer;">❌ Refuser</button>` : ''}
                </div>
            </div>
        `;
    });
}

async function validerVendeur(id, statut) {
    const ok = await confirmerAction(
        "✅ Validation du vendeur",
        "Voulez-vous vraiment valider ce vendeur ? Il pourra se connecter et vendre sur Leyamo."
    );
    if (!ok) return;

    try {
        const reponse = await fetch(`${API}/admin/vendeurs/${id}/valider`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({ statut })
        });
        const data = await reponse.json();
        afficherNotification(data.message, "success");
        chargerVendeurs();
        chargerStats();
    } catch (e) {
        afficherNotification("Erreur", "error");
    }
}

async function refuserVendeur(id) {
    const motif = prompt("Motif du refus :");
    if (motif === null) return;
    
    const ok = await confirmerAction(
        "❌ Refus du vendeur",
        `Voulez-vous vraiment refuser ce vendeur ? Motif : "${motif}"`
    );
    if (!ok) return;

    try {
        const reponse = await fetch(`${API}/admin/vendeurs/${id}/valider`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({ statut: 'refuse', motif })
        });
        const data = await reponse.json();
        afficherNotification(data.message, "success");
        chargerVendeurs();
        chargerStats();
    } catch (e) {
        afficherNotification("Erreur", "error");
    }
}

// ---------- PRODUITS ----------
async function chargerProduits(filtre = 'recent', page = 1) {
    filtreActuel = filtre;
    try {
        const reponse = await fetch(`${API}/admin/produits?filtre=${filtre}&page=${page}`, { headers: { "Authorization": token } });
        const data = await reponse.json();
        afficherProduitsAdmin(data.data);
        afficherPaginationAdmin(data.pagination);
    } catch (e) { afficherNotification("Erreur produits", "error"); }
}

function afficherProduitsAdmin(produits) {
    const c = document.getElementById("liste-produits");
    c.innerHTML = "";
    if (!produits || produits.length === 0) { c.innerHTML = "<p>Aucun produit</p>"; return; }
    produits.forEach(p => {
        const stat = { 'valide': '#16a34a', 'refuse': '#dc2626', 'en_attente': '#f59e0b' };
        const texte = { 'valide': '✅ Validé', 'refuse': '❌ Refusé', 'en_attente': '⏳ En attente' };
        const bg = stat[p.statut] || '#f59e0b';
        c.innerHTML += `
            <div style="background:white;padding:16px 20px;border-radius:12px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                <div style="flex:2;min-width:150px;">
                    <img src="${p.image_url || 'https://via.placeholder.com/60x60'}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;float:left;margin-right:12px;">
                    <strong>${p.nom_produit}</strong>
                    <p style="color:#0f766e;font-weight:600;">${p.prix} FCFA</p>
                    <p style="font-size:13px;">🏷️ ${p.categorie}</p>
                    <p style="font-size:13px;">👤 ${p.nom_vendeur || 'Vendeur'}</p>
                    <p style="font-size:13px;">👁 ${p.vues} vues | 💬 ${p.clic_whatsapp} clics</p>
                    <p style="font-size:12px;color:#64748b;">📅 ${new Date(p.date_creation).toLocaleDateString('fr-FR')}</p>
                </div>
                <div><span style="background:${bg};color:white;padding:4px 14px;border-radius:50px;font-size:13px;font-weight:600;">${texte[p.statut] || '⏳ En attente'}</span>${p.motif_refus ? `<p style="font-size:12px;color:#dc2626;">Motif: ${p.motif_refus}</p>` : ''}</div>
                <div style="display:flex;gap:8px;">
                    ${p.statut !== 'valide' ? `<button onclick="validerProduit(${p.id},'valide')" style="background:#16a34a;color:white;border:none;padding:6px 16px;border-radius:50px;cursor:pointer;">✅ Valider</button>` : ''}
                    ${p.statut !== 'refuse' ? `<button onclick="validerProduit(${p.id},'refuse')" style="background:#dc2626;color:white;border:none;padding:6px 16px;border-radius:50px;cursor:pointer;">❌ Refuser</button>` : ''}
                </div>
            </div>
        `;
    });
}

function afficherPaginationAdmin(pagination) {
    let container = document.getElementById("pagination-produits");
    if (!container) {
        const parent = document.getElementById("liste-produits");
        const div = document.createElement("div");
        div.id = "pagination-produits";
        div.style.cssText = "display:flex;justify-content:center;gap:8px;margin-top:20px;flex-wrap:wrap;";
        parent.appendChild(div);
        container = div;
    }
    container.innerHTML = "";
    if (!pagination || pagination.pages <= 1) return;
    const { page, pages } = pagination;
    if (page > 1) {
        const btn = document.createElement("button");
        btn.textContent = "◀";
        btn.style.cssText = "padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:white;color:#0f766e;cursor:pointer;";
        btn.addEventListener("click", () => chargerProduits(filtreActuel, page - 1));
        container.appendChild(btn);
    }
    for (let i = 1; i <= Math.min(pages, 10); i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.style.cssText = `padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:${i === page ? '#0f766e' : 'white'};color:${i === page ? 'white' : '#0f766e'};cursor:pointer;`;
        btn.addEventListener("click", () => chargerProduits(filtreActuel, i));
        container.appendChild(btn);
    }
    if (page < pages) {
        const btn = document.createElement("button");
        btn.textContent = "▶";
        btn.style.cssText = "padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:white;color:#0f766e;cursor:pointer;";
        btn.addEventListener("click", () => chargerProduits(filtreActuel, page + 1));
        container.appendChild(btn);
    }
}

async function validerProduit(id, statut) {
    const action = statut === 'valide' ? 'valider' : 'refuser';
    const titre = statut === 'valide' ? "✅ Validation du produit" : "❌ Refus du produit";
    const message = statut === 'valide' 
        ? "Voulez-vous vraiment valider ce produit ? Il sera visible sur le site." 
        : "Voulez-vous vraiment refuser ce produit ?";

    const ok = await confirmerAction(titre, message);
    if (!ok) return;

    const motif = statut === 'refuse' ? prompt("Motif du refus :") : '';
    if (statut === 'refuse' && motif === null) return;

    try {
        const reponse = await fetch(`${API}/admin/produits/${id}/valider`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({ statut, motif })
        });
        const data = await reponse.json();
        afficherNotification(data.message, "success");
        chargerProduits(filtreActuel);
        chargerStats();
    } catch (e) {
        afficherNotification("Erreur", "error");
    }
}

// ---------- SIGNALEMENTS ----------
async function chargerSignalements() {
    try {
        const reponse = await fetch(`${API}/admin/signalements`, {
            headers: { "Authorization": token }
        });
        const data = await reponse.json();
        afficherSignalements(data.data);
    } catch (e) {}
}

function afficherSignalements(signalements) {
    const c = document.getElementById("signalements-liste");
    c.innerHTML = "";
    if (!signalements || signalements.length === 0) { c.innerHTML = "<p style='color:#64748b;'>✅ Aucun signalement</p>"; return; }
    signalements.forEach(s => {
        c.innerHTML += `
            <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f1f5f9;align-items:center;flex-wrap:wrap;">
                <span style="font-weight:600;min-width:120px;">📦 ${s.nom_produit}</span>
                <span style="color:#dc2626;font-weight:600;">${s.motif}</span>
                <span style="color:#64748b;font-size:13px;">${s.description || ''}</span>
                <span style="color:#94a3b8;font-size:12px;margin-left:auto;">${new Date(s.date_creation).toLocaleString('fr-FR')}</span>
                <button onclick="traiterSignalement(${s.id})" style="background:#0f766e;color:white;border:none;padding:4px 14px;border-radius:50px;cursor:pointer;font-size:12px;">✅ Traiter</button>
            </div>
        `;
    });
}

async function traiterSignalement(id) {
    try {
        const reponse = await fetch(`${API}/admin/signalements/${id}/traiter`, {
            method: "PUT",
            headers: { "Authorization": token, "X-CSRF-Token": csrf_token }
        });
        const data = await reponse.json();
        afficherNotification(data.message, "success");
        chargerSignalements();
        chargerStats();
    } catch (e) { afficherNotification("Erreur", "error"); }
}

// ---------- PUBLIER ----------
async function chargerProduitsPourPublication() {
    try {
        const reponse = await fetch(`${API}/admin/produits?filtre=recent&limit=100`, { headers: { "Authorization": token } });
        const data = await reponse.json();
        const select = document.getElementById("produit-publier");
        select.innerHTML = "";
        data.data.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.nom_produit} - ${p.prix} FCFA`;
            select.appendChild(opt);
        });
    } catch (e) {}
}

async function publierProduit() {
    const produitId = document.getElementById("produit-publier").value;
    const plateforme = document.getElementById("plateforme-publier").value;
    let message = document.getElementById("message-publier").value.trim();
    if (!produitId) { afficherNotification("Sélectionnez un produit", "error"); return; }
    if (!message) {
        message = `🔥 Découvrez ce produit sur Leyamo !\n\n${window.location.origin}/produit/${produitId}`;
    } else {
        const lien = `${window.location.origin}/produit/${produitId}`;
        if (!message.includes(lien)) {
            message += `\n\n🔗 Lien : ${lien}`;
        }
    }
    try {
        const reponse = await fetch(`${API}/admin/produits/${produitId}/publier`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({ plateforme, message })
        });
        const data = await reponse.json();
        afficherNotification("✅ URL générée", "success");
        document.getElementById("resultat-publication").innerHTML = `<a href="${data.url}" target="_blank" style="color:#0f766e;text-decoration:underline;">🔗 Ouvrir ${plateforme}</a>`;
    } catch (e) { afficherNotification("Erreur", "error"); }
}

// ---------- LOGS ----------
async function chargerLogs(page = 1) {
    logsPage = page;
    try {
        const reponse = await fetch(`${API}/admin/logs?page=${page}&limit=50`, { headers: { "Authorization": token } });
        const data = await reponse.json();
        afficherLogs(data.data);
        afficherPaginationLogs(data.pagination);
    } catch (e) { afficherNotification("Erreur logs", "error"); }
}

function afficherLogs(logs) {
    const c = document.getElementById("liste-logs");
    c.innerHTML = "";
    if (!logs || logs.length === 0) { c.innerHTML = "<p style='color:#64748b;'>Aucun log</p>"; return; }
    logs.forEach(log => {
        c.innerHTML += `<div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;flex-wrap:wrap;"><span style="color:#64748b;min-width:160px;">${new Date(log.date_creation).toLocaleString('fr-FR')}</span><span style="font-weight:600;min-width:120px;">${log.action}</span><span style="color:#475569;">${log.details || ''}</span>${log.ip ? `<span style="color:#94a3b8;margin-left:auto;">IP: ${log.ip}</span>` : ''}</div>`;
    });
}

function afficherPaginationLogs(pagination) {
    const c = document.getElementById("pagination-logs");
    c.innerHTML = "";
    if (!pagination || pagination.pages <= 1) return;
    const { page, pages } = pagination;
    if (page > 1) {
        const btn = document.createElement("button");
        btn.textContent = "◀";
        btn.style.cssText = "padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:white;color:#0f766e;cursor:pointer;";
        btn.addEventListener("click", () => chargerLogs(page - 1));
        c.appendChild(btn);
    }
    for (let i = 1; i <= Math.min(pages, 10); i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.style.cssText = `padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:${i === page ? '#0f766e' : 'white'};color:${i === page ? 'white' : '#0f766e'};cursor:pointer;`;
        btn.addEventListener("click", () => chargerLogs(i));
        c.appendChild(btn);
    }
    if (page < pages) {
        const btn = document.createElement("button");
        btn.textContent = "▶";
        btn.style.cssText = "padding:6px 14px;border:2px solid #0f766e;border-radius:50px;background:white;color:#0f766e;cursor:pointer;";
        btn.addEventListener("click", () => chargerLogs(page + 1));
        c.appendChild(btn);
    }
}

// ---------- ONGLETS ----------
document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".tab-btn").forEach(b => {
                b.style.background = "#e2e8f0";
                b.style.color = "#1e293b";
            });
            this.style.background = "#0f766e";
            this.style.color = "white";

            const tab = this.dataset.tab;

            // Affichage/masquage des sections
            document.getElementById("liste-vendeurs").style.display = tab === 'vendeurs' ? 'block' : 'none';
            document.getElementById("liste-produits").style.display = tab === 'produits' ? 'block' : 'none';
            document.getElementById("liste-signalements").style.display = tab === 'signalements' ? 'block' : 'none';
            document.getElementById("publier-produit").style.display = tab === 'publier' ? 'block' : 'none';
            document.getElementById("logs").style.display = tab === 'logs' ? 'block' : 'none';

            // Recharger les données à chaque clic
            if (tab === 'vendeurs') chargerVendeurs();
            if (tab === 'produits') chargerProduits(filtreActuel);
            if (tab === 'signalements') chargerSignalements();
            if (tab === 'publier') chargerProduitsPourPublication();
            if (tab === 'logs') chargerLogs(1);
        });
    });

    // Filtres admin
    document.querySelectorAll(".filtre-admin").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".filtre-admin").forEach(b => {
                b.style.background = "white";
                b.style.color = "#1e293b";
                b.style.border = "2px solid #e2e8f0";
            });
            this.style.background = "#0f766e";
            this.style.color = "white";
            this.style.border = "2px solid #0f766e";
            chargerProduits(this.dataset.filtre);
        });
    });

    // État initial
    document.getElementById("liste-produits").style.display = 'none';
    document.getElementById("liste-signalements").style.display = 'none';
    document.getElementById("publier-produit").style.display = 'none';
    document.getElementById("logs").style.display = 'none';
});

function adminDeconnexion() {
    localStorage.removeItem("token");
    localStorage.removeItem("csrf_token");
    afficherNotification("Déconnexion admin", "success");
    setTimeout(() => { window.location.href = "admin-connexion.html"; }, 300);
}

window.validerVendeur = validerVendeur;
window.refuserVendeur = refuserVendeur;
window.validerProduit = validerProduit;
window.publierProduit = publierProduit;
window.adminDeconnexion = adminDeconnexion;
window.traiterSignalement = traiterSignalement;