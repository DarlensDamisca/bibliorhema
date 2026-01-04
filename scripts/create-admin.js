const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const readline = require('readline');

// Récupérer l'URL MongoDB depuis les variables d'environnement
// Correction : éviter la répétition dans l'instruction OR
const uri = process.env.MONGO_URL || "mongodb+srv://biblio_db_user:rCeHHjhzP0KZpuaT@cluster0.gjsk6tp.mongodb.net";
const dbName = process.env.DB_NAME || 'immersive_library';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  let client;

  try {
    console.log('\n🔐 Création d\'un compte administrateur\n');

    // Vérifier l'URL MongoDB avant de continuer
    if (!uri || typeof uri !== 'string') {
      console.error('❌ URL MongoDB invalide ou non définie');
      console.error('URI reçue:', uri);
      process.exit(1);
    }

    if (!uri.startsWith('mongodb')) {
      console.error('❌ Format d\'URL MongoDB incorrect');
      console.error('L\'URL doit commencer par "mongodb://" ou "mongodb+srv://"');
      process.exit(1);
    }

    // Demander les informations
    const name = await question('Nom complet: ');
    const email = await question('Email: ');
    const password = await question('Mot de passe: ');
    const confirmPassword = await question('Confirmer le mot de passe: ');

    if (password !== confirmPassword) {
      console.error('❌ Les mots de passe ne correspondent pas');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Le mot de passe doit contenir au moins 6 caractères');
      process.exit(1);
    }

    // Connexion à MongoDB
    console.log('\n🔌 Connexion à MongoDB...');
    console.log('Connexion à la base de données:', dbName);
    
    client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000 // Timeout de 10 secondes
    });
    
    console.log('✅ Connecté à MongoDB avec succès');
    const db = client.db(dbName);

    // Vérifier si l'email existe déjà
    console.log('🔍 Vérification de l\'email...');
    const existingAdmin = await db.collection('admins').findOne({ email });
    if (existingAdmin) {
      console.error('❌ Un administrateur avec cet email existe déjà');
      process.exit(1);
    }

    // Hacher le mot de passe
    console.log('🔐 Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'admin
    const admin = {
      id: uuidv4(),
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('💾 Enregistrement dans la base de données...');
    await db.collection('admins').insertOne(admin);

    console.log('\n✅ Administrateur créé avec succès!');
    console.log('\n📧 Email:', email);
    console.log('🔑 Mot de passe:', password);
    console.log('\n⚠️  Notez ces identifiants en lieu sûr!\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('Détails techniques:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
    rl.close();
  }
}

// Exécuter avec gestion des erreurs
createAdmin().catch(error => {
  console.error('❌ Erreur lors de l\'exécution:', error);
  process.exit(1);
});