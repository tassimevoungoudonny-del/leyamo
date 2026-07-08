(function() {
    const BANNIERE_KEY = 'leyamo_banniere_whatsapp';
    const DELAI = 10000;

    const derniereFermeture = localStorage.getItem(BANNIERE_KEY);
    if (derniereFermeture && (Date.now() - parseInt(derniereFermeture) < 7 * 24 * 60 * 60 * 1000)) {
        return;
    }

    setTimeout(function() {
        const banniere = document.createElement('div');
        banniere.id = 'banniere-whatsapp';
        banniere.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            max-width: 320px;
            background: #25D366;
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.2);
            z-index: 9999;
            font-family: 'Segoe UI', sans-serif;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideIn 0.5s ease;
        `;
        banniere.innerHTML = `
            <span style="font-size:28px;">🎉</span>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:14px;">Ne manquez aucun bon plan !</div>
                <div style="font-size:12px;opacity:0.9;">Rejoignez notre chaîne WhatsApp</div>
            </div>
            <a href="https://whatsapp.com/channel/0029VbD41M8L2ATxlMRmo900" target="_blank" style="background:white;color:#25D366;padding:6px 12px;border-radius:50px;text-decoration:none;font-weight:600;font-size:12px;white-space:nowrap;">Rejoindre</a>
            <span onclick="this.parentElement.remove();localStorage.setItem('${BANNIERE_KEY}', Date.now());" style="cursor:pointer;font-size:18px;">✕</span>
        `;
        document.body.appendChild(banniere);
    }, DELAI);
})();