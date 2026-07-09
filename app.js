const API = "";
let categorieActuelle = "all";
let genreActuel = "all";
let limit = 30;
let prixMin = 0;
let prixMax = 100000;

const DEFAULT_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial, sans-serif' font-size='28' fill='%2394a3b8' text-anchor='middle' dy='.3em'%3ELeyamo%3C/text%3E%3C/svg%3E";

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

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const btn = document.querySelector(".btn-darkmode");
    if (btn) btn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

let timerInactivite;
function reinitialiserTimer() {
    clearTimeout(timerInactivite);
    timerInactivite = setTimeout(() => {
        if (localStorage.getItem("token")) {
            localStorage.removeItem("token");
            localStorage.removeItem("csrf_token");
            afficherNotification("⏰ Session expirée (30 min)", "info");
            window.location.href = "/connexion";
        }
    }, 30 * 60 * 1000);
}
document.addEventListener("click", reinitialiserTimer);
document.addEventListener("keydown", reinitialiserTimer);
document.addEventListener("scroll", reinitialiserTimer);
document.addEventListener("mousemove", reinitialiserTimer);
reinitialiserTimer();

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
    const filtres = document.querySelectorAll('.filtre-btn, .filtre-genre');
    filtres.forEach(btn => btn.disabled = true);
    const params = getUrlParams();
    params.set('page', page);
    const url = `${API}/produits/filtrer?${params}`;
    console.log("🔍 Appel API :", url);
    afficherLoader(true);
    try {
        const reponse = await fetch(url);
        const data = await reponse.json();
        console.log("✅ Données reçues :", data);
        afficherProduits(data.data);
        afficherPagination(data.pagination);
        const compteur = document.getElementById("compteur-produits");
        if (compteur) {
            const total = data.pagination?.total || 0;
            compteur.textContent = total === 0 ? "Aucun produit trouvé" :
                                    total === 1 ? "1 produit trouvé" :
                                    `${total} produits trouvés`;
        }
    } catch (erreur) {
        console.error("❌ Erreur :", erreur);
        afficherNotification("Erreur de chargement", "error");
        const compteur = document.getElementById("compteur-produits");
        if (compteur) compteur.textContent = "Erreur de chargement";
    } finally {
        filtres.forEach(btn => btn.disabled = false);
        afficherLoader(false);
    }
}

async function appliquerFiltres(page = 1) {
    chargerProduits(page);
}

let autocompleteTimeout;
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
    if (!list) return;
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
        div.addEventListener("click", () => window.location.href = `/produit/${item.id}`);
        list.appendChild(div);
    });
}

document.addEventListener("click", function(e) {
    if (!e.target.closest(".search-box")) {
        document.getElementById("autocomplete-list")?.classList.remove("active");
    }
});

async function rechercherProduit(page = 1) {
    const rechercheInput = document.getElementById("recherche");
    if (!rechercheInput) return;
    const motCle = rechercheInput.value.trim();
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
         // ---- AJOUT : mettre à jour le compteur avec le total de la recherche ----
        const compteur = document.getElementById("compteur-produits");
        if (compteur) {
            const total = data.pagination?.total || 0;
            compteur.textContent = total === 0 ? "Aucun produit trouvé" :
                                    total === 1 ? "1 produit trouvé" :
                                    `${total} produits trouvés`;
        }
        document.getElementById("autocomplete-list")?.classList.remove("active");
    } catch (erreur) {
        afficherNotification("Erreur lors de la recherche", "error");
    } finally {
        afficherLoader(false);
    }
}

function reinitialiserRecherche() {
    const rechercheInput = document.getElementById("recherche");
    if (rechercheInput) rechercheInput.value = "";
    document.getElementById("clear-search")?.style.setProperty('display', 'none');
    document.getElementById("autocomplete-list")?.classList.remove("active");
    categorieActuelle = "all";
    genreActuel = "all";
    prixMin = 0;
    prixMax = 100000;
    const prixMinInput = document.getElementById("prix-min");
    const prixMaxInput = document.getElementById("prix-max");
    if (prixMinInput) prixMinInput.value = 0;
    if (prixMaxInput) prixMaxInput.value = 100000;
    const prixMinLabel = document.getElementById("prix-min-label");
    const prixMaxLabel = document.getElementById("prix-max-label");
    if (prixMinLabel) prixMinLabel.textContent = "0";
    if (prixMaxLabel) prixMaxLabel.textContent = "100 000";
    document.querySelectorAll(".filtre-btn, .filtre-genre").forEach(b => b.classList.remove("active"));
    document.querySelector(".filtre-btn[data-categorie='all']")?.classList.add("active");
    document.querySelector(".filtre-genre[data-genre='all']")?.classList.add("active");
    appliquerFiltres(1);
    afficherNotification("Tous les produits", "success");
}

function afficherPagination(pagination) {
    const container = document.getElementById("pagination");
    if (!container) return;
    container.innerHTML = "";
    if (!pagination || pagination.pages <= 1) return;
    const { page, pages, total } = pagination;
    if (page > 1) {
        const btn = document.createElement("button");
        btn.textContent = "◀";
        btn.addEventListener("click", () => rechercherProduit(page - 1));
        container.appendChild(btn);
    }
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
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

function formaterPrix(prix) {
    return new Intl.NumberFormat('fr-FR').format(prix);
}

function afficherProduits(produits) {
    const liste = document.getElementById("liste-produits");
    if (!liste) return;
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
                        🏪 <a href="/boutique?id=${produit.id_vendeur}" onclick="event.stopPropagation();">${produit.nom_boutique || 'Boutique'}</a>
                    </div>
                    <div class="boutons">
                        <a href="/produit/${produit.id}" class="btn voir" onclick="event.stopPropagation();">Voir</a>
                        <a href="/produit/${produit.id}" class="btn commander" onclick="event.stopPropagation();">Commander</a>
                    </div>
                    <button onclick="event.stopPropagation(); signalerProduit(${produit.id}, '${produit.nom_produit}')" class="btn-signaler">🚨 Signaler</button>
                </div>
            </div>
        `;
    });
}

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
                        <button class="btn btn-qv-voir" onclick="window.location.href='/produit/${id}'">Voir le produit</button>
                        <button class="btn btn-qv-commander" onclick="window.location.href='/produit/${id}'">Commander</button>
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
    document.getElementById("quick-view-overlay")?.classList.remove("active");
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
    console.log("🚀 DOM chargé, initialisation...");
    const darkBtn = document.querySelector(".btn-darkmode");
    if (darkBtn && localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
        darkBtn.textContent = "☀️";
    }
    const rechercheInput = document.getElementById("recherche");
    if (rechercheInput) {
        rechercheInput.addEventListener("input", function() {
            const value = this.value.trim();
            const clearBtn = document.getElementById("clear-search");
            if (clearBtn) clearBtn.style.display = value.length > 0 ? "flex" : "none";
            clearTimeout(autocompleteTimeout);
            if (value.length >= 2) {
                autocompleteTimeout = setTimeout(() => autocomplete(value), 300);
            } else {
                document.getElementById("autocomplete-list")?.classList.remove("active");
            }
        });
        rechercheInput.addEventListener("keyup", function(e) {
            if (e.key === "Enter") rechercherProduit(1);
        });
    }
    const clearBtn = document.getElementById("clear-search");
    if (clearBtn) {
        clearBtn.addEventListener("click", reinitialiserRecherche);
    }
    document.addEventListener("click", function(e) {
        const catBtn = e.target.closest(".filtre-btn");
        if (catBtn) {
            document.querySelectorAll(".filtre-btn").forEach(b => b.classList.remove("active"));
            catBtn.classList.add("active");
            categorieActuelle = catBtn.dataset.categorie;
            chargerProduits(1);
        }
        const genreBtn = e.target.closest(".filtre-genre");
        if (genreBtn) {
            document.querySelectorAll(".filtre-genre").forEach(b => b.classList.remove("active"));
            genreBtn.classList.add("active");
            genreActuel = genreBtn.dataset.genre;
            chargerProduits(1);
        }
    });
    const prixMinInput = document.getElementById("prix-min");
    const prixMaxInput = document.getElementById("prix-max");
    const prixMinLabel = document.getElementById("prix-min-label");
    const prixMaxLabel = document.getElementById("prix-max-label");
    if (prixMinInput) {
        prixMinInput.addEventListener("input", function() {
            prixMin = parseInt(this.value);
            if (prixMinLabel) prixMinLabel.textContent = formaterPrix(prixMin);
            chargerProduits(1);
        });
    }
    if (prixMaxInput) {
        prixMaxInput.addEventListener("input", function() {
            prixMax = parseInt(this.value);
            if (prixMaxLabel) prixMaxLabel.textContent = formaterPrix(prixMax);
            chargerProduits(1);
        });
    }
    const limitSelect = document.getElementById("limit-select");
    if (limitSelect) {
        limitSelect.addEventListener("change", function() {
            limit = parseInt(this.value);
            chargerProduits(1);
        });
    }
    const viewGrid = document.getElementById("view-grid");
    const viewList = document.getElementById("view-list");
    if (viewGrid) {
        viewGrid.addEventListener("click", function() {
            viewGrid.classList.add("active");
            viewList?.classList.remove("active");
            document.getElementById("liste-produits")?.classList.remove("liste");
        });
    }
    if (viewList) {
        viewList.addEventListener("click", function() {
            viewList.classList.add("active");
            viewGrid?.classList.remove("active");
            document.getElementById("liste-produits")?.classList.add("liste");
        });
    }
    chargerProduits(1);
    console.log("✅ Initialisation terminée.");
});

function ouvrirLightbox(src) {
    const existing = document.getElementById('lightbox-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.92);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        padding: 20px;
        animation: fadeIn 0.3s ease;
    `;
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = `
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 4px 30px rgba(0,0,0,0.5);
    `;
    overlay.appendChild(img);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function() {
        this.remove();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const ov = document.getElementById('lightbox-overlay');
            if (ov) ov.remove();
        }
    });
}

window.rechercherProduit = rechercherProduit;
window.reinitialiserRecherche = reinitialiserRecherche;
window.signalerProduit = signalerProduit;
window.afficherLoader = afficherLoader;
window.toggleDarkMode = toggleDarkMode;
window.quickView = quickView;
window.fermerQuickView = fermerQuickView;