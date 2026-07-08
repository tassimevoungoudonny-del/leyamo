// ============================================
// CONFIRMATION DE SORTIE SUR FORMULAIRES
// ============================================
(function() {
    let formModifie = false;

    // Détecter les modifications sur les champs de formulaire
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        // Pour les champs texte, on écoute l'événement 'input'
        input.addEventListener('input', function() {
            // Ignorer les champs de type file (pour éviter les faux positifs)
            if (this.type !== 'file') {
                formModifie = true;
            }
        });
        // Pour les selects et checkboxes/radios, on écoute 'change'
        input.addEventListener('change', function() {
            formModifie = true;
        });
    });

    // Réinitialiser le flag lors de la soumission du formulaire (si un formulaire existe)
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function() {
            formModifie = false;
        });
    }

    // Écouter le clic sur le bouton d'ajout/modification (cas où il n'y a pas de formulaire)
    const btnAjouter = document.getElementById('btn-ajouter') || document.querySelector('button[onclick*="ajouterProduit"], button[onclick*="modifierProduit"]');
    if (btnAjouter) {
        btnAjouter.addEventListener('click', function() {
            formModifie = false;
        });
    }

    // Afficher une confirmation lors du rechargement/fermeture de la page
    window.addEventListener('beforeunload', function(e) {
        if (formModifie) {
            e.preventDefault();
            e.returnValue = 'Voulez-vous vraiment quitter ? Vos modifications seront perdues.';
            return e.returnValue;
        }
    });

    // Pour les liens internes qui quittent la page (optionnel)
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (formModifie && this.href && !this.href.startsWith(window.location.origin + window.location.pathname)) {
                const confirmMsg = 'Voulez-vous vraiment quitter ? Vos modifications seront perdues.';
                if (!confirm(confirmMsg)) {
                    e.preventDefault();
                } else {
                    formModifie = false; // si l'utilisateur confirme, on désactive le flag
                }
            }
        });
    });
})();