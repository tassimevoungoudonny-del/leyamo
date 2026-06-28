const API = "http://127.0.0.1:5000";

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

chargerProduit();

async function chargerProduit() {
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const produit = data.data;

        document.getElementById("nom").innerHTML = produit.nom_produit;
        document.getElementById("prix").innerHTML = produit.prix + " FCFA";
        document.getElementById("categorie").innerHTML = produit.categorie;
        document.getElementById("description").innerHTML = produit.description_produit;

        const lieu = produit.localisation_detaillee || produit.localisation_boutique || "Non renseigné";
        document.getElementById("lieu").innerHTML = lieu;

        document.getElementById("vues").innerHTML = `👁 ${produit.vues || 0} vues`;
        document.getElementById("boutique").innerHTML = "🏪 " + (produit.nom_boutique || "Boutique");

        const images = produit.images || [];
        const principale = document.getElementById("image-principale");
        const miniaturesDiv = document.getElementById("miniatures");
        miniaturesDiv.innerHTML = "";

        if (images.length > 0) {
            principale.src = images[0];
            images.forEach((url, index) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = index === 0 ? "active" : "";
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

        document.getElementById("btn-whatsapp").onclick = () => {
            enregistrerClic();
            const message = encodeURIComponent(`Bonjour, je suis intéressé par ${produit.nom_produit}`);
            window.open(`https://wa.me/237${produit.num_whatsapp}?text=${message}`, "_blank");
        };

    } catch (erreur) {
        console.error(erreur);
        afficherNotification("Erreur de chargement", "error");
    }
}

async function enregistrerClic() {
    try {
        await fetch(`${API}/produits/${id}/whatsapp`, { method: "POST" });
    } catch (erreur) {
        console.error(erreur);
    }
}