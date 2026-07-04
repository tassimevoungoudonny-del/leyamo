const API = "";
let categorieActuelle = "all", genreActuel = "all", limit = 30;
let vueActuelle = 'grid';
let prixMin = 0;
let prixMax = 100000;

// ============================================
// IMAGE PAR DÉFAUT (SVG intégré)
// ============================================
const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='28' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ELeyamo%3C/text%3E%3C/svg%3E";

// ============================================
// LOADER
// ============================================
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

// ============================================
// MODE SOMBRE
// ============================================
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const btn = document.querySelector(".btn-darkmode");
    btn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}
if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
    document.querySelector(".btn-darkmode").textContent = "☀️";
}

// ============================================
// DÉCONNEXION AUTOMATIQUE (30 min)
// ============================================
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

// ============================================
// CHARGEMENT PRODUITS
// ============================================
chargerProduits();

function getUrlParams() {
    const params = new URLSearchParams();
    params.set('page', 1);
    params.set('limit', limit);
    if (categorieActuelle && categorieActuelle !== 'all') params.set('categorie', categorieActuelle);
    if (genreActuel && genreActuel !== 'all') params.set('genre', genreActuel);
    if (prixMin > 0) params.set('prix_min', prixMin);
    if (prixMax < 100000) params.set('prix_max', prixMax);
    return params;
}

async function chargerProduits(page = 1) {
    const params = getUrlParams();
    params.set('page', page);
    afficherLoader(true);
    try {
        const reponse = await fetch(`${API}/produits/filtrer?${params}`);
        const data = await reponse.json();
        afficherProduits(data.data);
        afficherPagination(data.pagination);
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    } finally {
        afficherLoader(false);
    }
}

async function appliquerFiltres(page = 1) {
    chargerProduits(page);
}

// ============================================
// RECHERCHE AVEC AUTOCOMPLÉTION
// ============================================
let autocompleteTimeout;

document.getElementById("recherche").addEventListener("input", function() {
    const value = this.value.trim();
    const clearBtn = document.getElementById("clear-search");
    clearBtn.style.display = value.length > 0 ? "flex" : "none";
    clearTimeout(autocompleteTimeout);
    if (value.length >= 2) {
        autocompleteTimeout = setTimeout(() => autocomplete(value), 300);
    } else {
        document.getElementById("autocomplete-list").classList.remove("active");
    }
});

async function autocomplete(q) {
    try {
        const reponse = await fetch(`${API}/produits/autocomplete?q=${encodeURIComponent(q)}`);
        const data = await reponse.json();
        afficherAutocomplete(data.data);
    } catch (erreur) {
        console.error(erreur);
    }
}

function afficherAutocomplete(resultats) {
    const list = document.getElementById("autocomplete-list");
    list.innerHTML = "";
    if (!resultats || resultats.length === 0) {
        list.classList.remove("active");
        return;
    }
    list.classList.add("active");
    resultats.forEach(item => {
        const div = document.createElement("div");
        div.className = "autocomplete-item";
        const image = item.image_url || DEFAULT_IMAGE;
        div.innerHTML = `
            <img src="${image}" alt="${item.nom_produit}">
            <div class="info">
                <div class="nom">${item.nom_produit}</div>
                <div class="prix">${formaterPrix(item.prix)} FCFA</div>
            </div>
        `;
        div.addEventListener("click", () => {
            window.location.href = `produit.html?id=${item.id}`;
        });
        list.appendChild(div);
    });
}

document.addEventListener("click", function(e) {
    if (!e.target.closest(".search-box")) {
        document.getElementById("autocomplete-list").classList.remove("active");
    }
});

// ============================================
// RECHERCHE
// ============================================
async function rechercherProduit(page = 1) {
    const motCle = document.getElementById("recherche").value.trim();
    if (!motCle) {
        appliquerFiltres(1);
        return;
    }
    afficherLoader(true);
    try {
        const reponse = await fetch(`${API}/recherche?q=${motCle}&page=${page}&limit=${limit}`);
        const data = await reponse.json();
        afficherProduits(data.resultats);
        afficherPagination(data.pagination);
        document.getElementById("autocomplete-list").classList.remove("active");
    } catch (erreur) {
        afficherNotification("Erreur lors de la recherche", "error");
    } finally {
        afficherLoader(false);
    }
}

function reinitialiserRecherche() {
    document.getElementById("recherche").value = "";
    document.getElementById("clear-search").style.display = "none";
    document.getElementById("autocomplete-list").classList.remove("active");
    categorieActuelle = "all";
    genreActuel = "all";
    prixMin = 0;
    prixMax = 100000;
    document.getElementById("prix-min").value = 0;
    document.getElementById("prix-max").value = 100000;
    document.getElementById("prix-min-label").textContent = "0";
    document.getElementById("prix-max-label").textContent = "100 000";
    document.querySelectorAll(".filtre-btn, .filtre-genre").forEach(b => b.classList.remove("active"));
    document.querySelector(".filtre-btn[data-categorie='all']")?.classList.add("active");
    document.querySelector(".filtre-genre[data-genre='all']")?.classList.add("active");
    appliquerFiltres(1);
    afficherNotification("Tous les produits", "success");
}

// ============================================
// FILTRES PRIX
// ============================================
document.getElementById("prix-min").addEventListener("input", function() {
    prixMin = parseInt(this.value);
    document.getElementById("prix-min-label").textContent = formaterPrix(prixMin);
    chargerProduits(1);
});
document.getElementById("prix-max").addEventListener("input", function() {
    prixMax = parseInt(this.value);
    document.getElementById("prix-max-label").textContent = formaterPrix(prixMax);
    chargerProduits(1);
});

// ============================================
// LIMIT
// ============================================
document.getElementById("limit-select").addEventListener("change", function() {
    limit = parseInt(this.value);
    chargerProduits(1);
});

// ============================================
// VUE GRILLE / LISTE
// ============================================
document.getElementById("view-grid").addEventListener("click", function() {
    vueActuelle = 'grid';
    document.getElementById("view-grid").classList.add("active");
    document.getElementById("view-list").classList.remove("active");
    document.getElementById("liste-produits").classList.remove("liste");
});
document.getElementById("view-list").addEventListener("click", function() {
    vueActuelle = 'list';
    document.getElementById("view-list").classList.add("active");
    document.getElementById("view-grid").classList.remove("active");
    document.getElementById("liste-produits").classList.add("liste");
});

// ============================================
// PAGINATION
// ============================================
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

// ============================================
// FORMATAGE PRIX
// ============================================
function formaterPrix(prix) {
    return new Intl.NumberFormat('fr-FR').format(prix);
}

// ============================================
// AFFICHAGE PRODUITS
// ============================================
function afficherProduits(produits) {
    const liste = document.getElementById("liste-produits");
    liste.innerHTML = "";
    if (!produits || produits.length === 0) {
        liste.innerHTML = `<p style="text-align:center;color:#64748b;padding:40px;">Aucun produit trouvé.</p>`;
        return;
    }
    produits.forEach(produit => {
        const image = produit.image_url || DEFAULT_IMAGE;
        const prixFormate = formaterPrix(produit.prix);
        const promotion = produit.promotion || 0;
        let prixAffichage = `<span class="prix">${prixFormate} FCFA</span>`;
        if (promotion > 0) {
            const prixPromo = formaterPrix(produit.prix * (1 - promotion / 100));
            prixAffichage = `
                <span class="prix-barre">${prixFormate} FCFA</span>
                <span class="prix">${prixPromo} FCFA</span>
                <span class="badge-promo">-${promotion}%</span>
            `;
        }
        liste.innerHTML += `
            <div class="carte" onclick="quickView(${produit.id})" data-id="${produit.id}">
                <img src="${image}" class="image-produit" alt="${produit.nom_produit}" loading="lazy">
                <div class="info-produit">
                    <h3>${produit.nom_produit}</h3>
                    <div>${prixAffichage}</div>
                    <span class="categorie">${produit.categorie}</span>
                    <div class="boutique-lien">
                        🏪 <a href="boutique.html?id=${produit.id_vendeur}" onclick="event.stopPropagation();">${produit.nom_boutique || 'Boutique'}</a>
                    </div>
                    <div class="boutons">
                        <a href="produit.html?id=${produit.id}" class="btn voir" onclick="event.stopPropagation();">Voir</a>
                        <a href="produit.html?id=${produit.id}" class="btn commander" onclick="event.stopPropagation();">Commander</a>
                    </div>
                    <button onclick="event.stopPropagation(); signalerProduit(${produit.id}, '${produit.nom_produit}')" class="btn-signaler">🚨 Signaler</button>
                </div>
            </div>
        `;
    });
}

// ============================================
// APERÇU RAPIDE (QUICK VIEW)
// ============================================
async function quickView(id) {
    afficherLoader(true);
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const p = data.data;
        afficherLoader(false);
        let overlay = document.getElementById("quick-view-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.id = "quick-view-overlay";
            overlay.className = "quick-view-overlay";
            overlay.innerHTML = `
                <div class="quick-view-content">
                    <span class="close-qv" onclick="fermerQuickView()">&times;</span>
                    <img id="qv-image" class="qv-image" src="" alt="">
                    <h2 id="qv-titre" class="qv-titre"></h2>
                    <div id="qv-prix" class="qv-prix"></div>
                    <p id="qv-description" class="qv-description"></p>
                    <p id="qv-boutique" class="qv-boutique"></p>
                    <div id="qv-avis" style="font-size:14px;color:#64748b;margin-top:8px;"></div>
                    <div class="qv-boutons">
                        <button class="btn btn-qv-voir" onclick="window.location.href='produit.html?id=${id}'">Voir le produit</button>
                        <button class="btn btn-qv-commander" onclick="window.location.href='produit.html?id=${id}'">Commander</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        document.getElementById("qv-image").src = (p.images && p.images.length > 0) ? p.images[0] : DEFAULT_IMAGE;
        document.getElementById("qv-titre").textContent = p.nom_produit;
        const prixFormate = formaterPrix(p.prix);
        if (p.promotion && p.promotion > 0) {
            const prixPromo = formaterPrix(p.prix * (1 - p.promotion / 100));
            document.getElementById("qv-prix").innerHTML = `
                <span class="prix-barre">${prixFormate} FCFA</span>
                <span class="prix">${prixPromo} FCFA</span>
                <span class="badge-promo">-${p.promotion}%</span>
            `;
        } else {
            document.getElementById("qv-prix").innerHTML = `${prixFormate} FCFA`;
        }
        document.getElementById("qv-description").textContent = p.description_produit || "Aucune description";
        document.getElementById("qv-boutique").innerHTML = `🏪 ${p.nom_boutique || 'Boutique'}`;
        // Avis
        try {
            const avisRep = await fetch(`${API}/produits/${id}/avis`);
            const avisData = await avisRep.json();
            const etoiles = "⭐".repeat(Math.round(avisData.moyenne || 0)) + "☆".repeat(5 - Math.round(avisData.moyenne || 0));
            document.getElementById("qv-avis").innerHTML = `⭐ ${avisData.moyenne ? avisData.moyenne.toFixed(1) : '0'} (${avisData.total || 0} avis) ${etoiles}`;
        } catch(e) {}
        overlay.classList.add("active");
    } catch (erreur) {
        afficherLoader(false);
        afficherNotification("Erreur", "error");
    }
}

function fermerQuickView() {
    document.getElementById("quick-view-overlay").classList.remove("active");
}

// ============================================
// SIGNALEMENT
// ============================================
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

// ============================================
// ÉVÉNEMENTS
// ============================================
document.addEventListener("DOMContentLoaded", function() {
    // --- Délégation pour les catégories ---
    document.addEventListener("click", function(e) {
        const btn = e.target.closest(".filtre-btn");
        if (btn) {
            console.log("🔵 Clic catégorie :", btn.dataset.categorie);
            document.querySelectorAll(".filtre-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            categorieActuelle = btn.dataset.categorie;
            chargerProduits(1);
        }
    });

    // --- Délégation pour les genres ---
    document.addEventListener("click", function(e) {
        const btn = e.target.closest(".filtre-genre");
        if (btn) {
            console.log("🔵 Clic genre :", btn.dataset.genre);
            document.querySelectorAll(".filtre-genre").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            genreActuel = btn.dataset.genre;
            chargerProduits(1);
        }
    });

    // --- Recherche ---
    const rechercheInput = document.getElementById("recherche");
    if (rechercheInput) {
        rechercheInput.addEventListener("keyup", function(e) {
            if (e.key === "Enter") rechercherProduit(1);
        });
    } else {
        console.error("⚠️ Élément #recherche introuvable");
    }
});

window.rechercherProduit = rechercherProduit;
window.reinitialiserRecherche = reinitialiserRecherche;
window.signalerProduit = signalerProduit;
window.afficherLoader = afficherLoader;
window.toggleDarkMode = toggleDarkMode;
window.quickView = quickView;
window.fermerQuickView = fermerQuickView;