const API = "";
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
chargerProduit();

async function chargerProduit() {
    try {
        const reponse = await fetch(`${API}/produits/${id}`);
        const data = await reponse.json();
        const p = data.data;
        document.getElementById("nom").innerHTML = p.nom_produit;
        document.getElementById("prix").innerHTML = p.prix + " FCFA";
        document.getElementById("categorie").innerHTML = p.categorie;
        document.getElementById("description").innerHTML = p.description_produit;
        document.getElementById("lieu").innerHTML = p.localisation_detaillee || p.localisation_boutique || "Non renseigné";
        document.getElementById("vues").innerHTML = `👁 ${p.vues || 0} vues`;
        document.getElementById("boutique").innerHTML = "🏪 " + (p.nom_boutique || "Boutique");

        const images = p.images || [];
        const principale = document.getElementById("image-principale");
        const miniaturesDiv = document.getElementById("miniatures");
        miniaturesDiv.innerHTML = "";
        if (images.length > 0) {
            principale.src = images[0];
            images.forEach((url, idx) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = idx === 0 ? "active" : "";
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
            window.open(`https://wa.me/237${p.num_whatsapp}?text=${encodeURIComponent(`Bonjour, intéressé par ${p.nom_produit}`)}`, "_blank");
        };
    } catch (erreur) {
        afficherNotification("Erreur de chargement", "error");
    }
}

async function enregistrerClic() {
    try { await fetch(`${API}/produits/${id}/whatsapp`, { method: "POST" }); } catch (e) {}
}