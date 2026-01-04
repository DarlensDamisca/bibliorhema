# 📚 Bibliothèque Immersive - Guide d'Installation

## 📦 Contenu du ZIP

Ce fichier ZIP contient le code source complet de la **Bibliothèque Immersive**, une application web premium avec effet Spotlight, lecteur PDF, chat IA, et lecteur audio.

## 🚀 Installation Rapide

### Prérequis
- Node.js 18+ (recommandé: 20+)
- MongoDB installé et lancé
- Yarn (ou npm)

### Étapes d'Installation

```bash
# 1. Extraire le ZIP
unzip bibliotheque-immersive.zip
cd app

# 2. Installer les dépendances
yarn install
# ou
npm install

# 3. Configurer les variables d'environnement
# Le fichier .env est déjà inclus avec les configurations par défaut

# 4. Démarrer MongoDB (si pas déjà lancé)
# Sur Linux/Mac:
sudo systemctl start mongodb
# ou
mongod

# 5. Charger les données d'exemple
node scripts/seed-books.js

# 6. Lancer l'application en développement
yarn dev
# ou
npm run dev

# 7. Ouvrir dans le navigateur
# http://localhost:3000
```

## 📁 Structure du Projet

```
app/
├── app/                          # Next.js App Router
│   ├── page.js                   # Page d'accueil avec pagination
│   ├── book/[id]/page.js        # Page lecture (PDF + Chat + Audio)
│   ├── admin/                    # Section admin
│   │   ├── page.js              # Login admin
│   │   └── dashboard/page.js    # Dashboard avec CRUD
│   ├── api/[[...path]]/route.js # API backend complète
│   ├── layout.js                # Layout principal
│   └── globals.css              # Styles globaux
│
├── components/                   # Composants React
│   ├── SpotlightCard.jsx        # Card avec effet spotlight
│   ├── SpotlightBackground.jsx  # Background animé
│   ├── LoadingSkeleton.jsx      # Skeleton loader
│   ├── AudioPlayer.jsx          # Lecteur audio complet
│   └── ui/                      # Composants shadcn/ui
│
├── public/                      # Fichiers statiques
│   └── uploads/                 # Dossier pour uploads
│       ├── covers/              # Images de couverture
│       ├── books/               # PDFs
│       └── audio/               # Fichiers audio
│
├── scripts/
│   └── seed-books.js           # Script de chargement des données
│
├── .env                        # Variables d'environnement
├── package.json                # Dépendances
├── tailwind.config.js          # Config Tailwind
├── postcss.config.js           # Config PostCSS
└── README.md                   # Documentation complète
```

## ⚙️ Configuration

### Variables d'Environnement (.env)

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=immersive_library

# Next.js
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# API
CORS_ORIGINS=*

# OpenAI (clé Emergent fournie)
OPENAI_API_KEY=sk-emergent-eB29066CeBcA8700eC

# NextAuth
NEXTAUTH_SECRET=immersive-library-secret-key-2025
NEXTAUTH_URL=http://localhost:3000
```

**Note:** La clé OpenAI Emergent est fournie et fonctionne avec GPT-4 Turbo.

## 🎯 Fonctionnalités Principales

### Interface Client
- ✨ Effet Spotlight dynamique
- 📚 12 livres classiques français préchargés
- 🔍 Recherche et filtres avancés
- 📄 Pagination (12 livres/page)
- 📱 100% Responsive

### Page Lecture
- 📖 Viewer PDF complet (react-pdf)
- 💬 Chat IA avec GPT-4 Turbo
- 🎵 Lecteur audio professionnel
- 📱 Design adaptatif mobile/desktop

### Dashboard Admin
- 🔐 Login: `admin@library.com` / `admin123`
- 📊 Statistiques temps réel
- 📤 Upload fichiers (PDF, images, audio)
- ✏️ CRUD livres complet

### Backend API
- ✅ Pagination avec filtres
- ✅ Upload multi-fichiers
- ✅ Chat IA streaming
- ✅ Authentification admin
- ✅ CRUD complet

## 🛠️ Commandes Disponibles

```bash
# Développement
yarn dev              # Lance le serveur de développement

# Production
yarn build            # Compile pour production
yarn start            # Lance le serveur de production

# Données
node scripts/seed-books.js    # Charge les livres d'exemple

# Linting (optionnel)
yarn lint             # Vérifie le code
```

## 📊 Base de Données

### MongoDB Collections

**books** - Stocke tous les livres
```javascript
{
  id: String (UUID),
  title: String,
  author: String,
  category: String,
  year: Number,
  description: String,
  coverImage: String (URL),
  pdfUrl: String,
  audioUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Charger les Données d'Exemple

```bash
node scripts/seed-books.js
```

Cela créera 12 livres classiques avec:
- Titres et auteurs
- Catégories variées
- Images de couverture (Unsplash)
- URLs pour PDF et audio (à uploader via admin)

## 🔧 Dépannage

### MongoDB ne démarre pas
```bash
# Vérifier le statut
sudo systemctl status mongodb

# Démarrer MongoDB
sudo systemctl start mongodb

# Ou avec mongod directement
mongod --dbpath /data/db
```

### Port 3000 déjà utilisé
```bash
# Modifier le port dans package.json
"dev": "next dev --port 3001"
```

### Les images ne chargent pas
- Vérifiez votre connexion internet (images Unsplash)
- Uploadez vos propres images via le dashboard admin

### Le PDF ne s'affiche pas
- Uploadez un fichier PDF via le dashboard admin
- Vérifiez que le chemin est correct dans la base de données

### Le Chat IA ne répond pas
- Vérifiez la clé OpenAI dans .env
- Vérifiez votre connexion internet
- La clé Emergent fournie devrait fonctionner

## 📱 Test Responsive

L'application est entièrement responsive:
- 📱 Mobile: < 768px
- 📱 Tablette: 768px - 1024px
- 💻 Desktop: > 1024px

## 🎨 Personnalisation

### Changer les Couleurs
Éditez `tailwind.config.js` et `app/globals.css`

### Ajouter des Livres
1. Connectez-vous au dashboard admin
2. Cliquez sur "Nouveau Livre"
3. Remplissez les informations
4. Uploadez les fichiers (cover, PDF, audio)
5. Cliquez sur "Créer"

### Modifier l'Authentification Admin
Éditez `app/api/[[...path]]/route.js` ligne ~232

## 📚 Documentation Complète

- `README.md` - Documentation technique complète
- `GUIDE_UTILISATEUR.md` - Guide d'utilisation
- `test_result.md` - Résultats des tests

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

### Docker (Alternative)
```bash
# Build
docker build -t bibliotheque-immersive .

# Run
docker run -p 3000:3000 bibliotheque-immersive
```

### Variables d'Environnement Production
N'oubliez pas de configurer:
- `MONGO_URL` - URL MongoDB production
- `NEXT_PUBLIC_BASE_URL` - URL de production
- `OPENAI_API_KEY` - Votre clé (ou utilisez Emergent)
- `NEXTAUTH_SECRET` - Secret fort et unique

## 💡 Conseils

1. **Performance**: La pagination est activée par défaut (12 livres/page)
2. **Images**: Utilisez le lazy loading intégré
3. **PDF**: Se charge page par page automatiquement
4. **Audio**: Format MP3 recommandé pour compatibilité
5. **Sécurité**: Changez les credentials admin en production

## 🆘 Support

Si vous rencontrez des problèmes:
1. Vérifiez que MongoDB est lancé
2. Vérifiez que toutes les dépendances sont installées
3. Consultez les logs de la console
4. Vérifiez le fichier `.env`

## 📝 Licence

Ce projet est fourni à des fins éducatives et de démonstration.

## ✨ Technologies Utilisées

- Next.js 14 (App Router)
- React 18
- MongoDB
- Tailwind CSS + shadcn/ui
- Framer Motion
- react-pdf
- OpenAI GPT-4 Turbo
- HTML5 Audio

---

**Prêt à démarrer ?** 🚀

```bash
yarn install
node scripts/seed-books.js
yarn dev
```

Puis ouvrez http://localhost:3000

**Bon développement !** 📚✨
