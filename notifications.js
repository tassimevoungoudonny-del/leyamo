function afficherNotification(message, type = "success", duree = 3500) {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100px)";
        toast.style.transition = "all 0.4s";
        setTimeout(() => {
            toast.remove();
            if (container.children.length === 0) container.remove();
        }, 400);
    }, duree);
}