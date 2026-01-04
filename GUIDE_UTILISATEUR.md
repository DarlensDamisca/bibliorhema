# 🚀 Guide de Démarrage Rapide

## Accès Rapide

### Page d'Accueil
🌐 URL: `https://immersive-shelf.preview.emergentagent.com`

**Fonctionnalités:**
- 📚 Parcourir 12 livres classiques
- 🔍 Rechercher par titre/auteur
- 🏷️ Filtrer par catégorie/auteur
- 📄 Pagination automatique (12 livres/page)
- ✨ Effet Spotlight au survol des cards

### Page Lecture d'un Livre
📖 Cliquez sur n'importe quel livre

**Fonctionnalités:**
- 📄 **Lecteur PDF** - Navigation page par page avec boutons Précédent/Suivant
- 💬 **Chat IA** - Posez des questions sur le livre (alimenté par GPT-4 Turbo)
- 🎵 **Lecteur Audio** - Écoutez le livre (si disponible)
  - Play/Pause
  - Skip ±10 secondes
  - Contrôle du volume
  - Barre de progression

### Dashboard Admin
🔑 URL: `https://immersive-shelf.preview.emergentagent.com/admin`

**Identifiants:**
```
Email: admin@library.com
Mot de passe: admin123
```

**Fonctionnalités:**
- 📊 Statistiques en temps réel
- ➕ Ajouter de nouveaux livres
- ✏️ Modifier les livres existants
- 🗑️ Supprimer des livres
- 📤 Upload de fichiers:
  - Image de couverture (JPG, PNG, WEBP)
  - Fichier PDF du livre
  - Fichier Audio (MP3, WAV, OGG)

## 🎯 Scénarios d'Utilisation

### 1. Parcourir et Lire un Livre
1. Visitez la page d'accueil
2. Parcourez les livres ou utilisez les filtres
3. Cliquez sur un livre qui vous intéresse
4. Naviguez dans le PDF avec les boutons
5. Posez des questions au Chat IA
6. Écoutez l'audiobook si disponible

### 2. Ajouter un Nouveau Livre (Admin)
1. Connectez-vous au dashboard admin
2. Cliquez sur "Nouveau Livre"
3. Remplissez les informations:
   - Titre *
   - Auteur *
   - Catégorie *
   - Année (optionnel)
   - Description (optionnel)
4. Uploadez les fichiers:
   - Image de couverture * (obligatoire)
   - Fichier PDF * (obligatoire)
   - Fichier Audio (optionnel)
5. Cliquez sur "Créer"
6. Le livre apparaît immédiatement sur la page d'accueil

### 3. Utiliser le Chat IA
1. Ouvrez un livre
2. Dans la section "Chat IA" à droite
3. Tapez une question (exemples):
   - "Résume ce livre en 3 phrases"
   - "Qui sont les personnages principaux ?"
   - "Quelle est la morale de l'histoire ?"
4. L'IA répond en temps réel avec du streaming

### 4. Écouter un Livre Audio
1. Ouvrez un livre avec audio disponible
2. Utilisez le lecteur audio en haut à droite:
   - ▶️ Play/Pause
   - ⏪ Reculer de 10s
   - ⏩ Avancer de 10s
   - 🔊 Ajuster le volume
3. Suivez la progression dans la barre

## 🎨 Astuces & Fonctionnalités Cachées

### Effet Spotlight
- ✨ Déplacez votre souris sur les cards de livres
- L'effet spotlight suit votre curseur
- Fonctionne aussi sur le dashboard admin

### Raccourcis Clavier (Lecteur PDF)
- `←` ou bouton Précédent: Page précédente
- `→` ou bouton Suivant: Page suivante

### Filtres Combinés
- Vous pouvez combiner:
  - Recherche texte
  - Filtre catégorie
  - Filtre auteur
- Cliquez sur "Réinitialiser" pour tout effacer

### Pagination Intelligente
- Navigation par pages numérotées
- Boutons Précédent/Suivant
- Affiche toujours la première et dernière page
- Points de suspension (...) pour les pages cachées

## 📊 Données d'Exemple

Les 12 livres préchargés couvrent différentes catégories:
- Fiction, Science-Fiction
- Fantastique, Romance
- Classique, Philosophie
- Histoire, Conte

Chaque livre a:
- ✅ Titre et auteur
- ✅ Catégorie et année
- ✅ Description
- ✅ Image de couverture (Unsplash)
- ⚠️ PDF et Audio (placeholders - uploadez les vôtres!)

## 🔧 Dépannage Rapide

### Le PDF ne charge pas
- Vérifiez que le fichier PDF existe
- Uploadez un nouveau PDF via le dashboard admin

### L'audio ne joue pas
- Vérifiez que le fichier audio est dans un format supporté (MP3, WAV, OGG)
- Uploadez un nouvel audio via le dashboard admin

### Le Chat IA ne répond pas
- Vérifiez votre connexion internet
- L'API OpenAI est configurée avec la clé Emergent
- Réessayez avec une question plus simple

### Les images ne chargent pas
- Les images utilisent Unsplash (connexion internet requise)
- Uploadez vos propres images via le dashboard admin

## 🎓 Exemples de Questions pour le Chat IA

**Questions générales:**
- "De quoi parle ce livre ?"
- "Qui a écrit ce livre et quand ?"
- "Quel est le genre de ce livre ?"

**Analyse approfondie:**
- "Quels sont les thèmes principaux ?"
- "Analyse le style d'écriture de l'auteur"
- "Compare ce livre avec d'autres œuvres similaires"

**Pour les étudiants:**
- "Résume les chapitres principaux"
- "Quelles sont les citations importantes ?"
- "Explique le contexte historique"

## 💡 Conseils d'Utilisation

1. **Navigation efficace**
   - Utilisez les filtres pour trouver rapidement des livres
   - La recherche fonctionne sur titre, auteur ET description

2. **Lecture optimale**
   - Le PDF se charge page par page pour de meilleures performances
   - Utilisez le chat IA pour mieux comprendre

3. **Administration**
   - Uploadez tous les fichiers en une seule fois
   - Les fichiers sont stockés en sécurité dans `/uploads/`
   - Pas de limite au nombre de livres

4. **Performance**
   - Les images utilisent le lazy loading
   - La pagination évite de charger tous les livres
   - Les PDFs se chargent progressivement

---

**Besoin d'aide ?** Consultez le README.md complet pour plus de détails techniques.

**Prêt à explorer ?** 🚀 Commencez par https://immersive-shelf.preview.emergentagent.com
