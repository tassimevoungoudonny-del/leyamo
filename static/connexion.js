const API = "";

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

            try {
                const reponseMe = await fetch(`${API}/vendeurs/me`, {
                    headers: { "Authorization": data.token }
                });
                const dataMe = await reponseMe.json();

                if (dataMe.status === 'success') {
                    const nom = dataMe.data.nom || 'Vendeur';
                    const bienvenueDiv = document.getElementById('bienvenue-connexion');
                    const nomSpan = document.getElementById('nom-vendeur-bienvenue');
                    if (bienvenueDiv && nomSpan) {
                        nomSpan.textContent = nom;
                        bienvenueDiv.style.display = 'block';
                    }
                }
            } catch (e) {
                console.warn("Impossible de récupérer le nom du vendeur", e);
            }

            afficherNotification("✅ Connexion réussie", "success");
            setTimeout(() => {
                window.location.href = "/dashboard";
            }, 1500);

        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("❌ Erreur réseau", "error");
        console.error(erreur);
    }
}