const API = "http://127.0.0.1:5000";

async function connexion() {
    const email = document.getElementById("email").value.trim();
    const mot_de_passe = document.getElementById("mot_de_passe").value;
    if (!email || !mot_de_passe) {
        afficherNotification("Veuillez remplir tous les champs", "error");
        return;
    }
    try {
        const reponse = await fetch(`${API}/vendeurs/connexion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, mot_de_passe })
        });
        const data = await reponse.json();
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("csrf_token", data.csrf_token);
            afficherNotification("✅ Connexion réussie", "success");
            setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("Erreur réseau", "error");
    }
}