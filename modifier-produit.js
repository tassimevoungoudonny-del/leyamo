const API = "";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
let imageActuelle = "";

chargerProduit();

document.getElementById("image_produit")?.addEventListener("change", function(e) {
    const previewDiv = document.getElementById("preview-nouvelle-image");
    const previewImg = document.getElementById("nouvelle-image-preview");
    if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(event) {
            previewImg.src = event.target.result;
            previewDiv.style.display = "block";
        };
        reader.readAsDataURL(this.files[0]);
    } else {
        previewDiv.style.display = "none";
    }
});

async function chargerProduit() {
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const p = data.data;
        document.getElementById("nom_produit").value = p.nom_produit;
        document.getElementById("description_produit").value = p.description_produit || "";
        document.getElementById("prix").value = p.prix;
        document.getElementById("categorie").value = p.categorie;
        document.getElementById("genre").value = p.genre || 'unisexe';
        document.getElementById("info-produit").textContent = `Produit #${id} - Statut : ${p.statut}`;
        if (p.image_url) {
            document.getElementById("image_actuelle").src = p.image_url;
            imageActuelle = p.image_url;
        }
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

async function modifierProduit() {
    const token = localStorage.getItem("token");
    const csrf_token = localStorage.getItem("csrf_token");
    if (!token) {
        afficherNotification("Veuillez vous connecter", "error");
        window.location.href = "/connexion";
        return;
    }

    const nom_produit = document.getElementById("nom_produit").value.trim();
    const description_produit = document.getElementById("description_produit").value.trim();
    const prix = document.getElementById("prix").value;
    const categorie = document.getElementById("categorie").value;
    const genre = document.getElementById("genre").value;

    if (!nom_produit || !prix || !categorie) {
        afficherNotification("Veuillez remplir tous les champs obligatoires", "error");
        return;
    }

    const btn = document.getElementById("btn-modifier");
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Enregistrement...`;

    let imageUrl = imageActuelle;
    const fileInput = document.getElementById("image_produit");
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const formData = new FormData();
        formData.append("images", fileInput.files[0]);
        try {
            const uploadReponse = await fetch(`${API}/upload/${id}`, {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "X-CSRF-Token": csrf_token
                },
                body: formData
            });
            const uploadData = await uploadReponse.json();
            if (uploadReponse.status === 201 && uploadData.images && uploadData.images.length > 0) {
                imageUrl = uploadData.images[0];
                afficherNotification("✅ Image mise à jour", "success");
            }
        } catch (erreur) {
            afficherNotification("❌ Erreur lors de l'upload de l'image", "error");
            btn.disabled = false;
            btn.textContent = originalText;
            return;
        }
    }

    const payload = {
        nom_produit,
        description_produit,
        prix: parseFloat(prix),
        categorie,
        genre,
        image_url: imageUrl
    };

    try {
        const reponse = await fetch(`${API}/produits/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify(payload)
        });
        const data = await reponse.json();
        if (reponse.status === 200) {
            afficherNotification("✅ " + data.message, "success");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("❌ Erreur réseau", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}