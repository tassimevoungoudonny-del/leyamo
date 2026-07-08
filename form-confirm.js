(function() {
    let formModifie = false;

    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.type !== 'file') {
                formModifie = true;
            }
        });
        input.addEventListener('change', function() {
            formModifie = true;
        });
    });

    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function() {
            formModifie = false;
        });
    }

    const btnAjouter = document.getElementById('btn-ajouter') || document.querySelector('button[onclick*="ajouterProduit"], button[onclick*="modifierProduit"]');
    if (btnAjouter) {
        btnAjouter.addEventListener('click', function() {
            formModifie = false;
        });
    }

    window.addEventListener('beforeunload', function(e) {
        if (formModifie) {
            e.preventDefault();
            e.returnValue = 'Voulez-vous vraiment quitter ? Vos modifications seront perdues.';
            return e.returnValue;
        }
    });

    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (formModifie && this.href && !this.href.startsWith(window.location.origin + window.location.pathname)) {
                const confirmMsg = 'Voulez-vous vraiment quitter ? Vos modifications seront perdues.';
                if (!confirm(confirmMsg)) {
                    e.preventDefault();
                } else {
                    formModifie = false;
                }
            }
        });
    });
})();