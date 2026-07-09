const API = "";
let imagesSelectionnees = [];

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

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("images_produit").addEventListener("change", function() {
        const preview = document.getElementById("preview-images");
        preview.innerHTML = "";
        imagesSelectionnees = [];
        if (this.files.length > 3) {
            afficherNotification("⚠️ Maximum 3 photos", "error");
            this.value = "";
            return;
        }
        for (const file of this.files) {
            if (file.size > 10 * 1024 * 1024) {
                afficherNotification(`⚠️ ${file.name} > 10 Mo`, "error");
                continue;
            }
            imagesSelectionnees.push(file);
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement("img");
                img.src = e.target.result;
                img.style.cssText = "width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #e2e8f0;";
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    });
});

async function ajouterProduit() {
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

    afficherLoader(true);

    try {
        const reponseProduit = await fetch(`${API}/produits`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "X-CSRF-Token": csrf_token
            },
            body: JSON.stringify({
                nom_produit,
                description_produit,
                prix,
                categorie,
                genre,
                image_url: "",
                promotion: 0
            })
        });

        const dataProduit = await reponseProduit.json();
        if (reponseProduit.status !== 201) {
            afficherNotification("❌ " + dataProduit.message, "error");
            afficherLoader(false);
            return;
        }

        const produitId = dataProduit.produit_id;

        if (imagesSelectionnees.length > 0) {
            const formData = new FormData();
            for (const image of imagesSelectionnees) {
                formData.append("images", image);
            }
            const reponseImages = await fetch(`${API}/upload/${produitId}`, {
                method: "POST",
                headers: {
                    "Authorization": token,
                    "X-CSRF-Token": csrf_token
                },
                body: formData
            });
            if (reponseImages.status === 201) {
                afficherNotification("✅ Produit et images ajoutés !", "success");
            } else {
                const dataImages = await reponseImages.json();
                afficherNotification("⚠️ Produit créé mais " + dataImages.message, "error");
            }
        } else {
            afficherNotification("✅ Produit ajouté !", "success");
        }

        document.getElementById("nom_produit").value = "";
        document.getElementById("description_produit").value = "";
        document.getElementById("prix").value = "";
        document.getElementById("categorie").value = "";
        document.getElementById("genre").value = "unisexe";
        document.getElementById("images_produit").value = "";
        document.getElementById("preview-images").innerHTML = "";
        imagesSelectionnees = [];

    } catch (erreur) {
        afficherNotification("Erreur réseau", "error");
    } finally {
        afficherLoader(false);
    }
}