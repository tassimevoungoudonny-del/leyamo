const API = "http://127.0.0.1:5000";

async function inscription() {
    const nom = document.getElementById("nom").value.trim();
    const email = document.getElementById("email").value.trim();
    const mot_de_passe = document.getElementById("mot_de_passe").value;
    const num_whatsapp = document.getElementById("num_whatsapp").value.trim();
    const nom_boutique = document.getElementById("nom_boutique").value.trim();
    const localisation_boutique = document.getElementById("localisation_boutique").value.trim();
    const localisation_detaillee = document.getElementById("localisation_detaillee").value.trim();

    if (!nom || !email || !mot_de_passe || !num_whatsapp || !nom_boutique || !localisation_boutique) {
        afficherNotification("⚠️ Tous les champs obligatoires doivent être remplis", "error");
        return;
    }
    if (!email.includes("@") || !email.includes(".")) {
        afficherNotification("⚠️ Veuillez entrer un email valide", "error");
        return;
    }
    if (!/^\d+$/.test(num_whatsapp)) {
        afficherNotification("⚠️ Le numéro WhatsApp ne doit contenir que des chiffres", "error");
        return;
    }

    try {
        const reponse = await fetch(`${API}/vendeurs/inscription`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nom, email, mot_de_passe, num_whatsapp, nom_boutique,
                localisation_boutique, localisation_detaillee
            })
        });
        const data = await reponse.json();
        if (reponse.status === 201) {
            afficherNotification("✅ " + data.message, "success");
            setTimeout(() => { window.location.href = "connexion.html"; }, 3000);
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("Erreur réseau", "error");
    }
}