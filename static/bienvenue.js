(function() {
    const STORAGE_KEY = 'leyamo_bienvenue_ferme';

    if (localStorage.getItem(STORAGE_KEY)) {
        const container = document.getElementById('bienvenue-container');
        if (container) container.classList.add('cache');
        return;
    }

    window.fermerBienvenue = function() {
        const container = document.getElementById('bienvenue-container');
        if (container) {
            container.classList.add('cache');
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        }
    };

    document.addEventListener('click', function(e) {
        const container = document.getElementById('bienvenue-container');
        if (!container) return;
        if (!container.contains(e.target) && !e.target.closest('.bienvenue-close')) {
            // Ne pas fermer automatiquement
        }
    });
})();