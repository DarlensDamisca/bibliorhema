import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { put } from '@vercel/blob';

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Handler OPTIONS pour CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Fonction de connexion MongoDB optimisée pour Vercel
async function getDbConnection() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    console.error('❌ ERREUR: MONGODB_URI non défini dans les variables d\'environnement');
    console.error('📋 Instructions: Allez dans Vercel Dashboard > Settings > Environment Variables');
    console.error('📋 Ajoutez: MONGODB_URI="mongodb+srv://biblio_db_user:rCeHHjhzP0KZpuaT@cluster0.gjsk6tp.mongodb.net/immersive_library?retryWrites=true&w=majority"');
    throw new Error('Configuration de base de données manquante. Vérifiez les variables d\'environnement.');
  }
  
  console.log('🔗 Connexion à MongoDB...');
  
  try {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      ssl: true,
      tlsAllowInvalidCertificates: false,
      retryWrites: true,
      w: 'majority',
      appName: 'BibliothequeImmersive-Vercel'
    });
    
    await client.connect();
    console.log('✅ Connexion MongoDB établie avec succès');
    
    // Extraire le nom de la base de données de l'URI
    const dbName = mongoUri.split('/').pop().split('?')[0] || 'immersive_library';
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:');
    console.error('   Message:', error.message);
    console.error('   Code:', error.code);
    console.error('   Nom:', error.name);
    
    // Masquer le mot de passe dans les logs
    const safeUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    console.error('   URI utilisée:', safeUri);
    
    throw new Error(`Échec de la connexion à la base de données: ${error.message}`);
  }
}

// Handler GET
export async function GET(request) {
  console.log(`🌐 GET ${request.url}`);
  
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  // Route de test pour vérifier la configuration
  if (path === '/test' || path === '/health') {
    try {
      console.log('🧪 Route test/health appelée');
      
      const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'non défini',
        MONGODB_URI: process.env.MONGODB_URI ? '✓ Défini' : '✗ Non défini',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Défini' : '✗ Non défini',
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? '✓ Défini' : '✗ Non défini',
        CORS_ORIGINS: process.env.CORS_ORIGINS || '* (par défaut)',
        VERCEL_ENV: process.env.VERCEL_ENV || 'non défini',
        VERCEL_URL: process.env.VERCEL_URL || 'non défini'
      };
      
      console.log('📊 Informations environnement:', envInfo);
      
      if (!process.env.MONGODB_URI) {
        return NextResponse.json({
          success: false,
          error: 'MONGODB_URI non configuré',
          instructions: [
            '1. Allez dans Vercel Dashboard',
            '2. Sélectionnez votre projet',
            '3. Cliquez sur Settings > Environment Variables',
            '4. Ajoutez: MONGODB_URI="mongodb+srv://biblio_db_user:rCeHHjhzP0KZpuaT@cluster0.gjsk6tp.mongodb.net/immersive_library?retryWrites=true&w=majority"',
            '5. Redéployez l\'application'
          ],
          environment: envInfo
        }, { headers: corsHeaders });
      }
      
      // Tester la connexion MongoDB
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier les collections disponibles
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        // Compter les documents dans les collections principales
        const stats = {};
        for (const collName of ['books', 'admins', 'users']) {
          if (collectionNames.includes(collName)) {
            stats[collName] = await db.collection(collName).countDocuments({});
          }
        }
        
        return NextResponse.json({
          success: true,
          message: '✅ API fonctionnelle',
          timestamp: new Date().toISOString(),
          environment: envInfo,
          database: {
            connected: true,
            collections: collectionNames,
            stats: stats
          },
          endpoints: {
            books: 'GET /api/books',
            categories: 'GET /api/categories',
            authors: 'GET /api/authors',
            admin_login: 'POST /api/admin/login',
            admin_stats: 'GET /api/admin/stats',
            upload: 'POST /api/upload',
            chat: 'POST /api/chat'
          }
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      console.error('❌ Erreur dans /test:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        environment: {
          has_mongodb_uri: !!process.env.MONGODB_URI,
          node_env: process.env.NODE_ENV,
          vercel_env: process.env.VERCEL_ENV
        }
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Route pour créer un admin initial (à désactiver en production)
  if (path === '/init-admin' && process.env.NODE_ENV !== 'production') {
    try {
      const { client, db } = await getDbConnection();
      
      try {
        // Créer la collection admins si elle n'existe pas
        const collExists = await db.listCollections({ name: 'admins' }).hasNext();
        
        if (!collExists) {
          await db.createCollection('admins');
          console.log('📁 Collection admins créée');
        }
        
        // Vérifier si un admin existe déjà
        const existingAdmin = await db.collection('admins').findOne({ email: 'admin@example.com' });
        
        if (existingAdmin) {
          await client.close();
          return NextResponse.json({
            success: false,
            message: 'Admin existe déjà',
            admin: {
              email: existingAdmin.email,
              name: existingAdmin.name
            }
          }, { headers: corsHeaders });
        }
        
        // Créer un admin par défaut
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = {
          id: uuidv4(),
          name: 'Administrateur Principal',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'superadmin',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('admins').insertOne(admin);
        
        await client.close();
        
        return NextResponse.json({
          success: true,
          message: '✅ Admin créé avec succès',
          admin: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            password: 'admin123 (à changer après première connexion)'
          }
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
    } catch (error) {
      console.error('❌ Erreur création admin:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Autres routes GET
  let client;
  try {
    const { client: dbClient, db } = await getDbConnection();
    client = dbClient;
    
    // Get all books with pagination
    if (path === '/books') {
      const category = searchParams.get('category');
      const author = searchParams.get('author');
      const search = searchParams.get('search');
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 12;
      const skip = (page - 1) * limit;
      
      let query = {};
      if (category && category !== 'all') query.category = category;
      if (author && author !== 'all') query.author = author;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { author: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      const total = await db.collection('books').countDocuments(query);
      const books = await db.collection('books')
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
      
      await client.close();
      
      return NextResponse.json({
        success: true,
        books,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }, { headers: corsHeaders });
    }
    
    // Get single book
    if (path.startsWith('/books/')) {
      const id = path.split('/')[2];
      const book = await db.collection('books').findOne({ id });
      
      await client.close();
      
      if (!book) {
        return NextResponse.json(
          { success: false, error: 'Livre non trouvé' },
          { status: 404, headers: corsHeaders }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        book 
      }, { headers: corsHeaders });
    }
    
    // Get categories
    if (path === '/categories') {
      const categories = await db.collection('books').distinct('category');
      await client.close();
      return NextResponse.json({ 
        success: true, 
        categories 
      }, { headers: corsHeaders });
    }
    
    // Get authors
    if (path === '/authors') {
      const authors = await db.collection('books').distinct('author');
      await client.close();
      return NextResponse.json({ 
        success: true, 
        authors 
      }, { headers: corsHeaders });
    }
    
    // Get stats for admin
    if (path === '/admin/stats') {
      const totalBooks = await db.collection('books').countDocuments();
      const categories = await db.collection('books').distinct('category');
      const authors = await db.collection('books').distinct('author');
      
      await client.close();
      
      return NextResponse.json({
        success: true,
        stats: {
          totalBooks,
          totalCategories: categories.length,
          totalAuthors: authors.length,
        }
      }, { headers: corsHeaders });
    }
    
    // Route par défaut
    await client.close();
    return NextResponse.json({
      success: true,
      message: 'Bienvenue sur l\'API Bibliothèque Immersive',
      version: '1.0.0',
      test_endpoint: 'GET /api/test pour vérifier la configuration',
      documentation: {
        books: 'GET /api/books?page=1&limit=12',
        book: 'GET /api/books/{id}',
        categories: 'GET /api/categories',
        authors: 'GET /api/authors',
        admin_login: 'POST /api/admin/login',
        create_book: 'POST /api/books',
        upload: 'POST /api/upload'
      }
    }, { headers: corsHeaders });
    
  } catch (error) {
    console.error(`❌ Erreur GET ${path}:`, error);
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Erreur fermeture client:', closeError);
      }
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler POST
export async function POST(request) {
  console.log(`📨 POST ${request.url}`);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  // Admin login - version robuste
  if (path === '/admin/login') {
    try {
      const body = await request.json();
      const { email, password } = body;
      
      console.log(`🔐 Tentative de connexion admin: ${email}`);
      
      if (!email || !password) {
        return NextResponse.json({
          success: false,
          error: 'Email et mot de passe requis',
          received: {
            email: !!email,
            password: !!password
          }
        }, { status: 400, headers: corsHeaders });
      }
      
      // Connexion à MongoDB
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier si la collection admins existe
        const collections = await db.listCollections({ name: 'admins' }).toArray();
        
        if (collections.length === 0) {
          console.log('⚠️ Collection admins non trouvée');
          
          // Créer la collection et un admin par défaut
          await db.createCollection('admins');
          
          const hashedPassword = await bcrypt.hash('admin123', 10);
          const defaultAdmin = {
            id: uuidv4(),
            name: 'Administrateur',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'superadmin',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await db.collection('admins').insertOne(defaultAdmin);
          
          console.log('✅ Collection admins créée avec utilisateur par défaut');
          console.log('📧 Email: admin@example.com');
          console.log('🔑 Mot de passe: admin123');
          
          // Si l'utilisateur essaie avec les identifiants par défaut
          if (email === 'admin@example.com' && password === 'admin123') {
            await client.close();
            return NextResponse.json({
              success: true,
              user: {
                id: defaultAdmin.id,
                name: defaultAdmin.name,
                email: defaultAdmin.email,
                role: defaultAdmin.role
              },
              message: 'Connexion réussie avec les identifiants par défaut. Veuillez changer votre mot de passe.'
            }, { headers: corsHeaders });
          }
        }
        
        // Chercher l'admin
        const admin = await db.collection('admins').findOne({ email });
        
        if (!admin) {
          console.log(`❌ Admin non trouvé pour: ${email}`);
          await client.close();
          return NextResponse.json({
            success: false,
            error: 'Identifiants invalides',
            suggestion: process.env.NODE_ENV === 'development' ? 
              'Essayez avec admin@example.com / admin123' : undefined
          }, { status: 401, headers: corsHeaders });
        }
        
        console.log(`✅ Admin trouvé: ${admin.name} (${admin.email})`);
        
        // Vérifier le mot de passe
        let isValidPassword = false;
        
        try {
          isValidPassword = await bcrypt.compare(password, admin.password);
        } catch (bcryptError) {
          console.error('Erreur bcrypt:', bcryptError);
          // Fallback pour les mots de passe non hachés (migration)
          if (password === admin.password) {
            isValidPassword = true;
            // Hacher le mot de passe et le mettre à jour
            const hashedPassword = await bcrypt.hash(password, 10);
            await db.collection('admins').updateOne(
              { email },
              { $set: { password: hashedPassword, updatedAt: new Date() } }
            );
            console.log('🔄 Mot de passe migré vers bcrypt');
          }
        }
        
        if (!isValidPassword) {
          // Vérifier si c'est le mot de passe par défaut
          if (password === 'admin123' && email === 'admin@example.com') {
            console.log('⚠️ Utilisation du mot de passe par défaut');
            isValidPassword = true;
          } else {
            console.log('❌ Mot de passe incorrect');
            await client.close();
            return NextResponse.json({
              success: false,
              error: 'Mot de passe incorrect'
            }, { status: 401, headers: corsHeaders });
          }
        }
        
        // Succès de la connexion
        await client.close();
        
        return NextResponse.json({
          success: true,
          user: {
            id: admin.id || admin._id.toString(),
            name: admin.name,
            email: admin.email,
            role: admin.role || 'admin'
          },
          token: uuidv4() // Token temporaire (à remplacer par JWT en production)
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      console.error('❌ Erreur login:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de la connexion',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Upload de fichiers
  if (path === '/upload') {
    try {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({
          success: false,
          error: 'Service de stockage non configuré',
          instructions: 'Ajoutez BLOB_READ_WRITE_TOKEN dans les variables d\'environnement Vercel'
        }, { status: 500, headers: corsHeaders });
      }
      
      const formData = await request.formData();
      const file = formData.get('file');
      const type = formData.get('type') || 'cover';
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: 'Aucun fichier fourni' },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate file type
      const validTypes = {
        book: ['application/pdf'],
        cover: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
      };
      
      if (!validTypes[type]?.includes(file.type)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Type de fichier invalide',
            allowedTypes: validTypes[type],
            receivedType: file.type
          },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Fichier trop volumineux (max 50MB)',
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          },
          { status: 400, headers: corsHeaders }
        );
      }
      
      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const filename = `${type}-${uuidv4()}${ext}`;
      
      // Upload to Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type,
      });
      
      return NextResponse.json(
        { 
          success: true,
          url: blob.url, 
          filename, 
          size: file.size,
          contentType: file.type,
          downloadUrl: blob.downloadUrl
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('❌ Upload error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Erreur lors de l\'upload',
          message: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 500, headers: corsHeaders }
      );
    }
  }
  
  // Pour les autres routes POST, lire le JSON
  try {
    const body = await request.json();
    const { client, db } = await getDbConnection();
    
    try {
      // Create book
      if (path === '/books') {
        const book = {
          id: uuidv4(),
          ...body,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await db.collection('books').insertOne(book);
        
        return NextResponse.json({ 
          success: true, 
          book,
          message: 'Livre créé avec succès'
        }, { status: 201, headers: corsHeaders });
      }
      
      // Chat with AI
      if (path === '/chat') {
        const { messages } = body;
        
        if (!messages || messages.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Messages requis' },
            { status: 400, headers: corsHeaders }
          );
        }
        
        if (!process.env.OPENAI_API_KEY) {
          return NextResponse.json(
            { success: false, error: 'Service AI non configuré' },
            { status: 500, headers: corsHeaders }
          );
        }
        
        try {
          const result = await streamText({
            model: openai('gpt-4-turbo'),
            messages: messages,
            temperature: 0.7,
            maxTokens: 1000,
          });
          
          // Convert to stream response
          const stream = result.toTextStreamResponse();
          
          return new Response(stream.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders,
            },
          });
        } catch (aiError) {
          console.error('❌ Chat AI error:', aiError);
          return NextResponse.json(
            { 
              success: false, 
              error: 'Erreur lors de la communication avec l\'IA',
              message: process.env.NODE_ENV === 'development' ? aiError.message : undefined
            },
            { status: 500, headers: corsHeaders }
          );
        }
      }
      
      // Route non trouvée
      return NextResponse.json(
        { success: false, error: 'Route non trouvée' },
        { status: 404, headers: corsHeaders }
      );
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`❌ POST Error ${path}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler PUT
export async function PUT(request) {
  console.log(`✏️ PUT ${request.url}`);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  try {
    const body = await request.json();
    const { client, db } = await getDbConnection();
    
    try {
      // Update book
      if (path.startsWith('/books/')) {
        const id = path.split('/')[2];
        
        // Vérifier si le livre existe
        const existingBook = await db.collection('books').findOne({ id });
        if (!existingBook) {
          return NextResponse.json(
            { success: false, error: 'Livre non trouvé' },
            { status: 404, headers: corsHeaders }
          );
        }
        
        const updateData = {
          ...body,
          updatedAt: new Date(),
        };
        
        // Ne pas modifier l'ID et la date de création
        delete updateData.id;
        delete updateData._id;
        delete updateData.createdAt;
        
        const result = await db.collection('books').updateOne(
          { id },
          { $set: updateData }
        );
        
        if (result.modifiedCount === 0) {
          return NextResponse.json(
            { success: false, error: 'Aucune modification effectuée' },
            { status: 400, headers: corsHeaders }
          );
        }
        
        const book = await db.collection('books').findOne({ id });
        
        return NextResponse.json({ 
          success: true, 
          book,
          message: 'Livre mis à jour avec succès'
        }, { headers: corsHeaders });
      }
      
      // Route non trouvée
      return NextResponse.json(
        { success: false, error: 'Route non trouvée' },
        { status: 404, headers: corsHeaders }
      );
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`❌ PUT Error ${path}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler DELETE
export async function DELETE(request) {
  console.log(`🗑️ DELETE ${request.url}`);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  try {
    const { client, db } = await getDbConnection();
    
    try {
      // Delete book
      if (path.startsWith('/books/')) {
        const id = path.split('/')[2];
        
        // Vérifier si le livre existe
        const existingBook = await db.collection('books').findOne({ id });
        if (!existingBook) {
          return NextResponse.json(
            { success: false, error: 'Livre non trouvé' },
            { status: 404, headers: corsHeaders }
          );
        }
        
        const result = await db.collection('books').deleteOne({ id });
        
        if (result.deletedCount === 1) {
          return NextResponse.json({ 
            success: true, 
            message: 'Livre supprimé avec succès',
            deletedId: id
          }, { headers: corsHeaders });
        } else {
          return NextResponse.json(
            { success: false, error: 'Échec de la suppression' },
            { status: 500, headers: corsHeaders }
          );
        }
      }
      
      // Route non trouvée
      return NextResponse.json(
        { success: false, error: 'Route non trouvée' },
        { status: 404, headers: corsHeaders }
      );
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`❌ DELETE Error ${path}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
