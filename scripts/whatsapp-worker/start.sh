#!/bin/bash
# ═══════════════════════════════════════════════════════════
# CampusFlow WhatsApp Worker — Script de démarrage Termux
# Usage: bash start.sh
# ═══════════════════════════════════════════════════════════

WORKER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   📱 CampusFlow WhatsApp Worker v1.0         ║"
echo "║   Powered by Baileys + Supabase              ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

cd "$WORKER_DIR"

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js non trouvé."
    echo "   Installez-le avec : pkg install nodejs -y"
    exit 1
fi

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env introuvable."
    echo "   Copiez .env.example et remplissez vos clés Supabase :"
    echo "   cp .env.example .env && nano .env"
    exit 1
fi

# Vérifier les dépendances
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances npm..."
    npm install --legacy-peer-deps
    echo ""
fi

# Afficher le mode de lancement
echo "🚀 Lancement du worker WhatsApp..."
echo "   → Polling Supabase toutes les 10 secondes"
echo "   → Scannez le QR code avec WhatsApp de l'école"
echo ""

# Détecter si on est en mode background (nohup) ou interactive
if [ -t 0 ]; then
    # Mode interactif (Termux direct)
    echo "💡 Astuce : Pour lancer en arrière-plan :"
    echo "   nohup bash start.sh > worker.log 2>&1 &"
    echo "   tail -f worker.log"
    echo ""
    node index.js
else
    # Mode background (nohup)
    echo "$(date): Démarrage en mode background..." >> worker.log
    node index.js
fi
