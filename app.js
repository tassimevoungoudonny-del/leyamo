const API = "http://127.0.0.1:5000";
let categorieActuelle = "all", genreActuel = "all", limit = 30;

// ============ LOADER ============
function afficherLoader(actif) {
    let overlay = document.getElementById("loader-overlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "loader-overlay";
        overlay.className = "loader-overlay";
        overlay.innerHTML = `<div class="spinner"></div>`;
        document.body.appendChild(overlay);
    }
    overlay.className = `loader-overlay${actif ? ' active' : ''}`;
}

// ============ DÉCONNEXION AUTOMATIQUE (30 min) ============
let timerInactivite;
function reinitialiserTimer() {
    clearTimeout(timerInactivite);
    timerInactivite = setTimeout(() => {
        if (localStorage.getItem("token")) {
            localStorage.removeItem("token");
            localStorage.removeItem("csrf_token");
            afficherNotification("⏰ Session expirée (30 min)", "info");
            window.location.href = "connexion.html";
        }
    }, 30 * 60 * 1000);
}
document.addEventListener("click", reinitialiserTimer);
document.addEventListener("keydown", reinitialiserTimer);
document.addEventListener("scroll", reinitialiserTimer);
document.addEventListener("mousemove", reinitialiserTimer);
reinitialiserTimer();

// ============ CHARGEMENT PRODUITS ============
chargerProduits();

async function chargerProduits(page = 1) {
    try {
        const reponse = await fetch(`${API}/produits?page=${page}&limit=${limit}`);
        const data = await reponse.json();
        afficherProduits(data.data);
        afficherPagination(data.pagination);
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

async function appliquerFiltres(page = 1) {
    afficherLoader(true);
    try {
        const reponse = await fetch(`${API}/produits/filtrer?categorie=${categorieActuelle}&genre=${genreActuel}&page=${page}&limit=${limit}`);
        const data = await reponse.json();
        afficherProduits(data.data);
        afficherPagination(data.pagination);
    } catch (erreur) {
        afficherNotification("Erreur lors du filtrage", "error");
    } finally {
        afficherLoader(false);
    }
}

async function rechercherProduit(page = 1) {
    const motCle = document.getElementById("recherche").value.trim();
    if (!motCle) { appliquerFiltres(1); return; }
    afficherLoader(true);
    try {
        const reponse = await fetch(`${API}/recherche?q=${motCle}&page=${page}&limit=${limit}`);
        const data = await reponse.json();
        afficherProduits(data.resultats);
        afficherPagination(data.pagination);
    } catch (erreur) {
        afficherNotification("Erreur lors de la recherche", "error");
    } finally {
        afficherLoader(false);
    }
}

function afficherPagination(pagination) {
    const container = document.getElementById("pagination");
    container.innerHTML = "";
    if (!pagination || pagination.pages <= 1) return;
    const { page, pages, total } = pagination;
    if (page > 1) {
        const btn = document.createElement("button");
        btn.textContent = "◀";
        btn.addEventListener("click", () => rechercherProduit(page - 1));
        container.appendChild(btn);
    }
    for (let i = Math.max(1,page-2); i <= Math.min(pages,page+2); i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === page) btn.classList.add("active");
        btn.addEventListener("click", () => rechercherProduit(i));
        container.appendChild(btn);
    }
    if (page < pages) {
        const btn = document.createElement("button");
        btn.textContent = "▶";
        btn.addEventListener("click", () => rechercherProduit(page + 1));
        container.appendChild(btn);
    }
    const info = document.createElement("span");
    info.textContent = ` ${total} produits`;
    container.appendChild(info);
}

function reinitialiserRecherche() {
    document.getElementById("recherche").value = "";
    categorieActuelle = "all"; genreActuel = "all";
    document.querySelectorAll(".filtre-btn, .filtre-genre").forEach(b => b.classList.remove("active"));
    document.querySelector(".filtre-btn[data-categorie='all']")?.classList.add("active");
    document.querySelector(".filtre-genre[data-genre='all']")?.classList.add("active");
    appliquerFiltres(1);
    afficherNotification("Tous les produits", "success");
}

function afficherProduits(produits) {
    const liste = document.getElementById("liste-produits");
    liste.innerHTML = "";
    if (!produits || produits.length === 0) {
        liste.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px;">Aucun produit trouvé.</p>`;
        return;
    }
    produits.forEach(produit => {
        const image = produit.image_url || "https://via.placeholder.com/400x300";
        liste.innerHTML += `
            <div class="carte">
                <img src="${image}" class="image-produit" alt="${produit.nom_produit}">
                <div class="info-produit">
                    <h3>${produit.nom_produit}</h3>
                    <p class="prix">${produit.prix} FCFA</p>
                    <span class="categorie">${produit.categorie}</span>
                    <div class="boutons">
                        <a href="produit.html?id=${produit.id}" class="btn voir">Voir</a>
                        <a href="produit.html?id=${produit.id}" class="btn commander">Commander</a>
                    </div>
                    <button onclick="signalerProduit(${produit.id}, '${produit.nom_produit}')" style="background:transparent;border:none;color:#dc2626;font-size:12px;cursor:pointer;margin-top:8px;">🚨 Signaler</button>
                </div>
            </div>
        `;
    });
}

async function signalerProduit(id, nom) {
    const motif = prompt(`Motif du signalement pour "${nom}" :`);
    if (!motif) return;
    const description = prompt("Description (optionnelle) :");
    try {
        const reponse = await fetch(`${API}/produits/${id}/signaler`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ motif, description })
        });
        const data = await reponse.json();
        data.status === 'success' ? afficherNotification("✅ Signalement enregistré", "success") : afficherNotification("❌ " + data.message, "error");
    } catch (erreur) {
        afficherNotification("Erreur lors du signalement", "error");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".filtre-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".filtre-btn").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            categorieActuelle = this.dataset.categorie;
            appliquerFiltres(1);
        });
    });
    document.querySelectorAll(".filtre-genre").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".filtre-genre").forEach(b => b.classList.remove("active"));
            this.classList.add("active");
            genreActuel = this.dataset.genre;
            appliquerFiltres(1);
        });
    });
    document.getElementById("recherche").addEventListener("keyup", function(e) {
        if (e.key === "Enter") rechercherProduit(1);
    });
});

window.rechercherProduit = rechercherProduit;
window.reinitialiserRecherche = reinitialiserRecherche;
window.signalerProduit = signalerProduit;
window.afficherLoader = afficherLoader;