# 📱 Worker WhatsApp Baileys pour CampusFlow

Ce microservice autonome permet d'envoyer automatiquement les notifications WhatsApp (notes, reçus de paiement, sanctions) accumulées dans la file d'attente Supabase (`whatsapp_queue`).

---

## 🚀 Installation & Configuration

### Étape 1 : Cloner / Télécharger le dossier
Téléchargez ou naviguez dans ce dossier sur votre ordinateur ou votre smartphone Android :
```bash
cd scripts/whatsapp-worker
```

### Étape 2 : Installer les dépendances
```bash
npm install
```

### Étape 3 : Configurer le fichier `.env`
Copiez le fichier d'exemple et remplissez vos identifiants Supabase :
```bash
cp .env.example .env
```
Éditez le fichier `.env` :
```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre-cle-service-role-supabase
MESSAGE_DELAY_MS=3000
AUTO_STOP_WHEN_EMPTY=false
```

---

## 📲 Déclenchement & Connexion

### Option A : Sur Smartphone Android via Termux (Sans VPS)
1. Installez **Termux** depuis F-Droid ou GitHub.
2. Ouvrez Termux et exécutez :
   ```bash
   pkg update && pkg install nodejs git
   ```
3. Naviguez vers le dossier et lancez le script :
   ```bash
   node index.js
   ```
4. Scannez le QR Code affiché dans le terminal avec le WhatsApp de l'école (**WhatsApp -> Appareils connectés -> Connecter un appareil**).
5. La session est enregistrée dans `auth_info_baileys/`. Vous n'aurez plus besoin de rescanner le QR code !

---

### Option B : Sur Ordinateur de bureau / Secrétariat
1. Ouvrez un terminal dans `scripts/whatsapp-worker`.
2. Lancez :
   ```bash
   node index.js
   ```
3. Scannez le QR Code lors du premier lancement.

---

## ⚙️ Deux Modes d'Exécution

### Mode 1 : Continu (24h/24 ou pendant les heures de cours)
Dans `.env` :
`AUTO_STOP_WHEN_EMPTY=false`
Le script vérifie la file Supabase toutes les 10 secondes et envoie les messages dès qu'ils arrivent.

### Mode 2 : Ponctuel / Vides et Arrêt (`AUTO_STOP_WHEN_EMPTY=true`)
Dans `.env` :
`AUTO_STOP_WHEN_EMPTY=true`
Le script dépile tous les messages en attente, les envoie par vagues avec un délai de 3s, puis **s'arrête automatiquement**. Idéal pour une exécution quotidienne en fin de journée ou via une tâche planifiée (*Cron / Tasker*).

---

## 🛡️ Anti-Bannissement WhatsApp
Le worker intègre une pause configurable (`MESSAGE_DELAY_MS=3000`) entre chaque message pour simuler un comportement d'envoi humain et éviter tout blocage par l'algorithme anti-spam de WhatsApp.
