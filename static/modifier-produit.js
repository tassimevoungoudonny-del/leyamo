const API = "";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

chargerProduit();

async function chargerProduit() {
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const p = data.data;
        document.getElementById("nom_produit").value = p.nom_produit;
        document.getElementById("description_produit").value = p.description_produit;
        document.getElementById("prix").value = p.prix;
        document.getElementById("categorie").value = p.categorie;
        document.getElementById("image_url").value = p.image_url || "";
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

async function modifierProduit() {
    const token = localStorage.getItem("token");
    const csrf_token = localStorage.getItem("csrf_token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        window.location.href = "connexion.html";
        return;
    }

    const nom_produit = document.getElementById("nom_produit").value.trim();
    const description_produit = document.getElementById("description_produit").value.trim();
    const prix = document.getElementById("prix").value;
    const categorie = document.getElementById("categorie").value;
    const image_url = document.getElementById("image_url").value.trim();

    if (!nom_produit || !prix || !categorie) {
        afficherNotification("Veuillez remplir tous les champs", "error");
        return;
    }

    try {
        const reponse = await fetch(`${API}/produits/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({ nom_produit, description_produit, prix, categorie, image_url })
        });
        const data = await reponse.json();
        reponse.status === 200 ? afficherNotification("✅ " + data.message, "success") : afficherNotification("❌ " + data.message, "error");
    } catch (erreur) {
        afficherNotification("Erreur réseau", "error");
    }
}