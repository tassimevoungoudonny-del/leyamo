// ============================================
// GESTION DU CACHE - VERSION AUTOMATIQUE
// ============================================
(function() {
    // Générer un timestamp unique pour cette session
    const timestamp = Date.now();

    // Fonction pour ajouter le timestamp à une URL
    function addVersion(url) {
        const separator = url.includes('?') ? '&' : '?';
        return url + separator + 'v=' + timestamp;
    }

    // Modifier toutes les balises <link> pour les fichiers CSS
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        if (link.href && !link.href.includes('v=')) {
            link.href = addVersion(link.href);
        }
    });

    // Modifier toutes les balises <script> pour les fichiers JS
    document.querySelectorAll('script[src]').forEach(script => {
        if (script.src && !script.src.includes('v=')) {
            script.src = addVersion(script.src);
        }
    });

    console.log('🔁 Version du cache :', timestamp);
})();