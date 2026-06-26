// pi-auth.js — Gère la connexion Pi Network sur RetroPi Games

const API_BASE = "https://TON-APP-RENDER.onrender.com"; // ⚠️ à remplacer par ton URL Render une fois déployé

let piUser = null;

function onIncompletePaymentFound(payment) {
  console.log("Paiement incomplet trouvé :", payment);
  // Tu pourras gérer ça plus tard si tu ajoutes des achats Premium
}

async function loginWithPi() {
  try {
    Pi.init({ version: "2.0", sandbox: true }); // ⚠️ mets sandbox: false quand tu es prêt pour la prod

    const scopes = ["username", "payments"];
    const authResult = await Pi.authenticate(scopes, onIncompletePaymentFound);

    piUser = authResult.user;
    localStorage.setItem("piUsername", piUser.username);

    const tag = document.getElementById("userTag");
    const btn = document.getElementById("loginBtn");
    if (tag && btn) {
      tag.textContent = "👤 " + piUser.username;
      tag.style.display = "inline-block";
      btn.style.display = "none";
    }
  } catch (err) {
    console.error("Erreur d'authentification Pi :", err);
    alert("Connexion Pi impossible. Es-tu bien dans le Pi Browser ?");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("loginBtn");
  if (btn) btn.addEventListener("click", loginWithPi);

  // Si déjà connecté précédemment (juste pour l'affichage, pas une vraie session sécurisée)
  const savedUsername = localStorage.getItem("piUsername");
  const tag = document.getElementById("userTag");
  if (savedUsername && tag) {
    tag.textContent = "👤 " + savedUsername;
    tag.style.display = "inline-block";
    if (btn) btn.style.display = "none";
  }
});
