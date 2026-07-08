// ============================================
// MESSAGE DE BIENVENUE
// ============================================
(function() {
    const STORAGE_KEY = 'leyamo_bienvenue_ferme';

    // Si l'utilisateur a déjà fermé le message, le cacher
    if (localStorage.getItem(STORAGE_KEY)) {
        const container = document.getElementById('bienvenue-container');
        if (container) container.classList.add('cache');
        return;
    }

    // Fonction pour fermer le message
    window.fermerBienvenue = function() {
        const container = document.getElementById('bienvenue-container');
        if (container) {
            container.classList.add('cache');
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
    };

    // Si l'utilisateur clique en dehors du message (optionnel)
    document.addEventListener('click', function(e) {
        const container = document.getElementById('bienvenue-container');
        if (!container) return;
        if (!container.contains(e.target) && !e.target.closest('.bienvenue-close')) {
            // Ne pas fermer automatiquement, seulement si on clique sur la croix
        }
    });
})();