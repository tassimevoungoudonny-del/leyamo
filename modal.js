// ============================================
// MODALE DE CONFIRMATION PERSONNALISÉE
// ============================================

function afficherConfirmation(titre, message, callback) {
    // Créer l'overlay
    const overlay = document.createElement("div");
    overlay.id = "modal-overlay";
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;

    // Créer la modale
    const modal = document.createElement("div");
    modal.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 30px 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
        border-top: 5px solid #0f766e;
    `;

    modal.innerHTML = `
        <h3 style="font-size: 22px; color: #064e3b; margin: 0 0 8px 0;">${titre}</h3>
        <p style="font-size: 16px; color: #475569; margin: 0 0 24px 0; line-height: 1.6;">${message}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="modal-annuler" style="
                padding: 10px 24px;
                border: 2px solid #e2e8f0;
                border-radius: 50px;
                background: white;
                color: #1e293b;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            ">Annuler</button>
            <button id="modal-confirmer" style="
                padding: 10px 24px;
                border: none;
                border-radius: 50px;
                background: #dc2626;
                color: white;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                font-size: 14px;
            ">Confirmer</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Gestion des boutons
    document.getElementById("modal-annuler").addEventListener("click", function() {
        overlay.remove();
        if (callback) callback(false);
    });

    document.getElementById("modal-confirmer").addEventListener("click", function() {
        overlay.remove();
        if (callback) callback(true);
    });

    // Fermer en cliquant à l'extérieur
    overlay.addEventListener("click", function(e) {
        if (e.target === overlay) {
            overlay.remove();
            if (callback) callback(false);
        }
    });

    // Animations CSS (ajoutées dynamiquement)
    const style = document.createElement("style");
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// VERSION SIMPLIFIÉE POUR LES CONFIRMATIONS
// ============================================
function confirmerAction(titre, message) {
    return new Promise((resolve) => {
        afficherConfirmation(titre, message, (resultat) => {
            resolve(resultat);
        });
    });
}

// Exemple d'utilisation :
// const ok = await confirmerAction("⚠️ Suppression", "Voulez-vous vraiment supprimer ce produit ?");
// if (ok) { ... }