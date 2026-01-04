# 🚀 Guide de Déploiement Vercel

## Prérequis

1. Compte Vercel (gratuit): https://vercel.com
2. Base de données MongoDB accessible depuis internet:
   - MongoDB Atlas (gratuit): https://www.mongodb.com/cloud/atlas
   - Ou votre propre serveur MongoDB

## 📋 Étape 1: Préparer MongoDB Atlas (si vous n'avez pas de MongoDB)

### Créer un cluster gratuit:

1. Aller sur https://www.mongodb.com/cloud/atlas
2. Créer un compte gratuit
3. Créer un nouveau cluster (Shared - FREE)
4. Dans "Database Access":
   - Créer un utilisateur avec mot de passe
   - Noter: username et password
5. Dans "Network Access":
   - Ajouter "0.0.0.0/0" (Allow access from anywhere)
6. Obtenir la connection string:
   - Cliquer sur "Connect" > "Connect your application"
   - Copier la string (ex: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Remplacer `<password>` par votre mot de passe

## 🚀 Étape 2: Déployer sur Vercel

### Option A: Via Interface Web (Recommandé)

1. **Pousser votre code sur GitHub/GitLab/Bitbucket**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <votre-repo-url>
   git push -u origin main
   ```

2. **Importer sur Vercel**
   - Aller sur https://vercel.com
   - Cliquer sur "Add New" > "Project"
   - Importer votre repository
   - Configurer les variables d'environnement:

   ```
   MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
   DB_NAME=immersive_library
   OPENAI_API_KEY=sk-emergent-eB29066CeBcA8700eC
   NEXTAUTH_SECRET=votre-secret-aleatoire-ici
   NEXTAUTH_URL=https://votre-app.vercel.app
   NEXT_PUBLIC_BASE_URL=https://votre-app.vercel.app
   ```

3. **Déployer**
   - Cliquer sur "Deploy"
   - Attendre 2-3 minutes

### Option B: Via CLI Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Suivre les instructions
# Configurer les variables d'environnement quand demandé
```

## 🔧 Étape 3: Configurer les Variables d'Environnement

Sur Vercel Dashboard > Votre Projet > Settings > Environment Variables:

| Variable | Valeur | Description |
|----------|--------|-------------|
| `MONGO_URL` | `mongodb+srv://...` | URL de connexion MongoDB Atlas |
| `DB_NAME` | `immersive_library` | Nom de la base de données |
| `OPENAI_API_KEY` | `sk-emergent-...` | Clé API OpenAI (fournie) |
| `NEXTAUTH_SECRET` | `secret-aleatoire-32-chars` | Secret pour NextAuth |
| `NEXTAUTH_URL` | `https://votre-app.vercel.app` | URL de votre app |
| `NEXT_PUBLIC_BASE_URL` | `https://votre-app.vercel.app` | URL publique |

### Générer NEXTAUTH_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📊 Étape 4: Initialiser la Base de Données

### 4.1 Créer l'administrateur

**Option 1: En local puis seed sur MongoDB Atlas**
```bash
# Configurer .env avec MongoDB Atlas
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=immersive_library

# Créer l'admin
node scripts/seed-admin.js

# Charger les livres d'exemple
node scripts/seed-books.js
```

**Option 2: Utiliser MongoDB Compass**
1. Télécharger MongoDB Compass: https://www.mongodb.com/products/compass
2. Se connecter avec votre string MongoDB Atlas
3. Créer la collection `admins`
4. Insérer un document:
   ```json
   {
     "id": "admin-001",
     "name": "Administrateur",
     "email": "admin@library.com",
     "password": "$2a$10$hashedPasswordHere",
     "role": "admin",
     "createdAt": { "$date": "2025-01-01T00:00:00.000Z" },
     "updatedAt": { "$date": "2025-01-01T00:00:00.000Z" }
   }
   ```
   Note: Utilisez `bcrypt` pour hacher le mot de passe

**Option 3: Créer via l'app déployée**
1. Déployer d'abord l'app
2. Utiliser MongoDB Atlas pour créer manuellement l'admin
3. Ou créer une route temporaire pour créer le premier admin

## ⚠️ Important: Gestion des Fichiers sur Vercel

### Problème:
Vercel a un filesystem **read-only**. Les uploads ne fonctionnent pas comme en local.

### Solutions:

#### Solution 1: Vercel Blob Storage (Recommandé)

```bash
# Installer
yarn add @vercel/blob

# Utiliser dans l'API
import { put } from '@vercel/blob';

const blob = await put(filename, file, {
  access: 'public',
});
// blob.url contient l'URL du fichier
```

#### Solution 2: Cloudinary (Gratuit)

1. Créer compte sur https://cloudinary.com
2. Installer: `yarn add cloudinary`
3. Configurer dans l'API

#### Solution 3: AWS S3

1. Créer bucket S3
2. Installer: `yarn add @aws-sdk/client-s3`
3. Configurer credentials

### Configuration Actuelle:

Pour l'instant, l'app utilise le stockage local. Pour Vercel:

1. **Modifier `/app/app/api/[[...path]]/route.js`**
2. **Remplacer la section upload par Vercel Blob**

## 📝 Étape 5: Vérifier le Déploiement

1. **Tester l'accueil**: `https://votre-app.vercel.app`
2. **Tester le login**: `https://votre-app.vercel.app/admin`
   - Email: admin@library.com (ou celui configuré)
   - Password: admin123 (ou celui configuré)
3. **Vérifier MongoDB**: Les connexions dans Atlas Dashboard

## 🔄 Redéploiement

### Automatique (avec GitHub):
Chaque push sur `main` déclenche un redéploiement automatique

### Manuel:
```bash
vercel --prod
```

## 🐛 Dépannage

### Erreur: "Cannot connect to MongoDB"
- Vérifier `MONGO_URL` dans les variables d'environnement
- Vérifier que l'IP 0.0.0.0/0 est autorisée dans MongoDB Atlas
- Vérifier username/password dans la connection string

### Erreur: "Admin not found"
- Créer l'admin avec `node scripts/seed-admin.js`
- Ou créer manuellement dans MongoDB Atlas

### Erreur: "File upload failed"
- Normal sur Vercel (filesystem read-only)
- Implémenter Vercel Blob ou Cloudinary

### Logs en temps réel:
```bash
vercel logs votre-app.vercel.app
```

## 🎯 Checklist de Déploiement

- [ ] MongoDB Atlas créé et configuré
- [ ] Repository Git créé et poussé
- [ ] Projet Vercel créé
- [ ] Variables d'environnement configurées
- [ ] Premier déploiement réussi
- [ ] Admin créé dans MongoDB
- [ ] Livres d'exemple chargés
- [ ] Login admin testé
- [ ] Upload de fichiers configuré (Vercel Blob)
- [ ] Chat IA testé
- [ ] Domaine personnalisé configuré (optionnel)

## 🚀 Résultat

Votre application sera accessible sur:
```
https://votre-app.vercel.app
```

Avec:
- ✅ SSL automatique (HTTPS)
- ✅ CDN global
- ✅ Déploiements automatiques
- ✅ Rollback en un clic
- ✅ Analytics inclus

## 💡 Conseils de Production

1. **Sécurité**:
   - Changez les identifiants admin par défaut
   - Utilisez un `NEXTAUTH_SECRET` fort
   - Limitez les IPs dans MongoDB Atlas si possible

2. **Performance**:
   - Activez les indexes MongoDB
   - Utilisez Vercel Edge Functions si besoin
   - Compressez les images avant upload

3. **Monitoring**:
   - Surveillez les logs Vercel
   - Vérifiez MongoDB Atlas metrics
   - Configurez les alertes

---

**Besoin d'aide?** Consultez:
- Documentation Vercel: https://vercel.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Next.js Docs: https://nextjs.org/docs