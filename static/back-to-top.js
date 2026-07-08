// ============================================
// BOUTON RETOUR EN HAUT (Back to Top)
// ============================================
(function() {
    // 1. Créer le bouton
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '↑';
    btn.setAttribute('aria-label', 'Retour en haut');
    document.body.appendChild(btn);

    // 2. Gérer l'affichage (apparition après 300px de scroll)
    function toggleButton() {
        if (window.scrollY > 300) {
            btn.classList.add('show');
        } else {
            btn.classList.remove('show');
        }
    }

    window.addEventListener('scroll', toggleButton);
    window.addEventListener('resize', toggleButton);
    toggleButton(); // Vérifier au chargement

    // 3. Action : remonter en haut avec animation fluide
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
})();