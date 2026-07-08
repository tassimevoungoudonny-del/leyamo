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
            // 1. Stocker les tokens
            localStorage.setItem("token", data.token);
            localStorage.setItem("csrf_token", data.csrf_token);

            // 2. Récupérer le nom du vendeur pour le message de bienvenue
            try {
                const reponseMe = await fetch(`${API}/vendeurs/me`, {
                    headers: { "Authorization": data.token }
                });
                const dataMe = await reponseMe.json();

                if (dataMe.status === 'success') {
                    const nom = dataMe.data.nom || 'Vendeur';
                    // Afficher le message de bienvenue dans la page de connexion
                    const bienvenueDiv = document.getElementById('bienvenue-connexion');
                    const nomSpan = document.getElementById('nom-vendeur-bienvenue');
                    if (bienvenueDiv && nomSpan) {
                        nomSpan.textContent = nom;
                        bienvenueDiv.style.display = 'block';
                    }
                }
            } catch (e) {
                // Ignorer les erreurs de récupération du nom
                console.warn("Impossible de récupérer le nom du vendeur", e);
            }

            // 3. Notifier et rediriger
            afficherNotification("✅ Connexion réussie", "success");
            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 1500);

        } else {
            afficherNotification("❌ " + data.message, "error");
        }
    } catch (erreur) {
        afficherNotification("❌ Erreur réseau", "error");
        console.error(erreur);
    }
}