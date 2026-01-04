const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'immersive_library';

// Admin par défaut pour testing
const defaultAdmin = {
  name: 'Administrateur',
  email: 'admin@library.com',
  password: 'admin123' // Sera haché
};

async function seedAdmin() {
  let client;

  try {
    console.log('🔌 Connexion à MongoDB...');
    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    // Vérifier si un admin existe déjà
    const existingAdmin = await db.collection('admins').findOne({ email: defaultAdmin.email });
    
    if (existingAdmin) {
      console.log('ℹ️  Un administrateur existe déjà avec cet email');
      return;
    }

    console.log('🔐 Hachage du mot de passe...');
    const hashedPassword = await bcrypt.hash(defaultAdmin.password, 10);

    const admin = {
      id: uuidv4(),
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('👤 Création de l\'administrateur...');
    await db.collection('admins').insertOne(admin);

    console.log('\n✅ Administrateur créé avec succès!');
    console.log('\n📧 Email:', defaultAdmin.email);
    console.log('🔑 Mot de passe:', defaultAdmin.password);
    console.log('\n⚠️  Changez ces identifiants en production!\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Connexion fermée');
    }
  }
}

seedAdmin();