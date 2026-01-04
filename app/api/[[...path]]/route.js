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
    console.error('❌ ERREUR: MONGODB_URI non configuré');
    throw new Error('Configuration de base de données manquante');
  }
  
  try {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
    });
    
    await client.connect();
    console.log('✅ Connexion MongoDB établie');
    
    const dbName = mongoUri.split('/').pop().split('?')[0] || 'immersive_library';
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    console.error('❌ Erreur MongoDB:', error);
    throw new Error(`Échec connexion base de données: ${error.message}`);
  }
}

// Handler GET
export async function GET(request) {
  console.log(`🌐 GET ${request.url}`);
  
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  // Route de test
  if (path === '/test' || path === '/health') {
    try {
      console.log('🧪 Test de santé API');
      
      const envInfo = {
        NODE_ENV: process.env.NODE_ENV || 'non défini',
        MONGODB_URI: process.env.MONGODB_URI ? '✓ Configuré' : '✗ Non configuré',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? '✓ Configuré' : '✗ Non configuré',
        BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? '✓ Configuré' : '✗ Non configuré',
        VERCEL_ENV: process.env.VERCEL_ENV || 'non défini'
      };
      
      // Tester la connexion MongoDB
      let dbConnected = false;
      let dbInfo = {};
      
      if (process.env.MONGODB_URI) {
        try {
          const { client, db } = await getDbConnection();
          await db.command({ ping: 1 });
          dbConnected = true;
          
          // Récupérer les collections
          const collections = await db.listCollections().toArray();
          dbInfo = {
            collections: collections.map(c => c.name),
            booksCount: await db.collection('books').countDocuments().catch(() => 0),
            adminsCount: await db.collection('admins').countDocuments().catch(() => 0)
          };
          
          await client.close();
        } catch (dbError) {
          console.error('❌ Test MongoDB échoué:', dbError);
          dbConnected = false;
          dbInfo = { error: dbError.message };
        }
      }
      
      return NextResponse.json({
        success: true,
        message: 'API Bibliothèque Immersive',
        timestamp: new Date().toISOString(),
        environment: envInfo,
        database: {
          connected: dbConnected,
          ...dbInfo
        },
        upload: {
          endpoints: {
            upload: 'POST /api/upload (avec Vercel Blob)',
            upload_test: 'POST /api/upload-test (simulé)',
            upload_url: 'POST /api/upload-url (URL externe)'
          },
          limits: {
            pdf: '50MB',
            image: '20MB',
            audio: '30MB'
          }
        },
        instructions: !process.env.MONGODB_URI ? [
          '1. Allez dans Vercel Dashboard > Settings > Environment Variables',
          '2. Ajoutez: MONGODB_URI="mongodb+srv://biblio_db_user:rCeHHjhzP0KZpuaT@cluster0.gjsk6tp.mongodb.net/immersive_library"',
          '3. Redéployez l\'application'
        ] : undefined
      }, { headers: corsHeaders });
      
    } catch (error) {
      console.error('❌ Erreur /test:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        environment: {
          node_env: process.env.NODE_ENV
        }
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Initialiser un admin (développement seulement)
  if (path === '/init-admin' && process.env.NODE_ENV !== 'production') {
    try {
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier/créer la collection admins
        const collExists = await db.listCollections({ name: 'admins' }).hasNext();
        
        if (!collExists) {
          await db.createCollection('admins');
        }
        
        // Vérifier si admin existe déjà
        const existingAdmin = await db.collection('admins').findOne({ email: 'admin@example.com' });
        
        if (existingAdmin) {
          return NextResponse.json({
            success: true,
            message: 'Admin existe déjà',
            admin: {
              email: existingAdmin.email,
              name: existingAdmin.name
            }
          }, { headers: corsHeaders });
        }
        
        // Créer admin par défaut
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const admin = {
          id: uuidv4(),
          name: 'Administrateur',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'superadmin',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('admins').insertOne(admin);
        
        return NextResponse.json({
          success: true,
          message: '✅ Admin créé avec succès',
          credentials: {
            email: 'admin@example.com',
            password: 'admin123',
            note: 'Changez le mot de passe après la première connexion'
          }
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
    } catch (error) {
      console.error('❌ Erreur init-admin:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Routes principales GET
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
        categories: categories.filter(c => c) // Filtrer les valeurs null
      }, { headers: corsHeaders });
    }
    
    // Get authors
    if (path === '/authors') {
      const authors = await db.collection('books').distinct('author');
      await client.close();
      return NextResponse.json({ 
        success: true, 
        authors: authors.filter(a => a)
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
      documentation: {
        test: 'GET /api/test',
        books: 'GET /api/books',
        categories: 'GET /api/categories',
        authors: 'GET /api/authors',
        admin_login: 'POST /api/admin/login',
        upload: 'POST /api/upload',
        chat: 'POST /api/chat'
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  
  // ========== UPLOAD DE FICHIERS ==========
  if (path === '/upload') {
    try {
      console.log('📤 Upload de fichier');
      
      // Obtenir le formData
      const formData = await request.formData();
      const file = formData.get('file');
      const type = formData.get('type') || 'cover';
      
      // Validation de base
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'Aucun fichier fourni'
        }, { status: 400, headers: corsHeaders });
      }
      
      console.log('📄 Fichier reçu:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        upload_type: type
      });
      
      // Types de fichiers acceptés
      const validTypes = {
        book: [
          'application/pdf',
          'application/x-pdf',
          'application/octet-stream'
        ],
        cover: [
          'image/jpeg', 
          'image/jpg', 
          'image/png', 
          'image/webp'
        ],
        audio: [
          'audio/mpeg', 
          'audio/mp3', 
          'audio/wav', 
          'audio/ogg'
        ]
      };
      
      // Vérification du type
      const allowedTypes = validTypes[type];
      if (!allowedTypes) {
        return NextResponse.json({
          success: false,
          error: `Type "${type}" invalide`,
          valid_types: Object.keys(validTypes)
        }, { status: 400, headers: corsHeaders });
      }
      
      // Accepter les PDF par extension même si le type MIME est différent
      const fileName = file.name.toLowerCase();
      const isPdfFile = fileName.endsWith('.pdf');
      
      if (!allowedTypes.includes(file.type) && !(type === 'book' && isPdfFile)) {
        return NextResponse.json({
          success: false,
          error: 'Type de fichier non supporté',
          received_type: file.type,
          allowed_types: allowedTypes,
          suggestion: type === 'book' ? 'Le fichier doit être un PDF (.pdf)' : 'Vérifiez le format du fichier'
        }, { status: 400, headers: corsHeaders });
      }
      
      // Limites de taille
      const sizeLimits = {
        book: 50 * 1024 * 1024,    // 50MB
        cover: 20 * 1024 * 1024,   // 20MB
        audio: 30 * 1024 * 1024    // 30MB
      };
      
      const maxSize = sizeLimits[type] || 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return NextResponse.json({
          success: false,
          error: 'Fichier trop volumineux',
          max_size_mb: maxSize / (1024 * 1024),
          file_size_mb: (file.size / (1024 * 1024)).toFixed(2)
        }, { status: 400, headers: corsHeaders });
      }
      
      // Vérifier Vercel Blob
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('⚠️ Vercel Blob non configuré, utilisation de fallback');
        
        // Fallback: retourner une URL simulée
        const simulatedUrl = `https://storage.bibliorhema.vercel.app/simulated/${type}/${uuidv4()}/${file.name}`;
        
        return NextResponse.json({
          success: true,
          url: simulatedUrl,
          filename: file.name,
          size: file.size,
          type: file.type,
          uploaded_type: type,
          simulated: true,
          message: 'Upload simulé - Configurez BLOB_READ_WRITE_TOKEN pour l\'upload réel'
        }, { headers: corsHeaders });
      }
      
      // Préparer l'upload vers Vercel Blob
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Générer un nom de fichier unique
      const extension = file.name.split('.').pop() || 
        (type === 'book' ? 'pdf' : 
         type === 'cover' ? 'jpg' : 
         type === 'audio' ? 'mp3' : 'bin');
      
      const filename = `${type}-${uuidv4()}.${extension}`;
      
      console.log('📤 Upload vers Vercel Blob...');
      
      // Upload vers Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type || 'application/octet-stream'
      });
      
      console.log('✅ Upload réussi:', blob.url);
      
      return NextResponse.json({
        success: true,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        filename: filename,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploaded_type: type
      }, { headers: corsHeaders });
      
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      return NextResponse.json({
        success: false,
        error: 'Échec de l\'upload',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Upload test (simulé)
  if (path === '/upload-test') {
    try {
      const formData = await request.formData();
      const file = formData.get('file');
      const type = formData.get('type') || 'cover';
      
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'Aucun fichier fourni'
        }, { status: 400, headers: corsHeaders });
      }
      
      // URL simulée
      const simulatedUrl = `https://storage.bibliorhema.vercel.app/${type}/${uuidv4()}/${file.name}`;
      
      return NextResponse.json({
        success: true,
        url: simulatedUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        uploaded_type: type,
        simulated: true,
        message: 'Upload simulé - Pour l\'upload réel, utilisez /upload avec Vercel Blob configuré'
      }, { headers: corsHeaders });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Upload par URL (alternative)
  if (path === '/upload-url') {
    try {
      const body = await request.json();
      const { url, type = 'cover', filename } = body;
      
      if (!url) {
        return NextResponse.json({
          success: false,
          error: 'URL requise'
        }, { status: 400, headers: corsHeaders });
      }
      
      // Valider l'URL
      try {
        new URL(url);
      } catch {
        return NextResponse.json({
          success: false,
          error: 'URL invalide'
        }, { status: 400, headers: corsHeaders });
      }
      
      return NextResponse.json({
        success: true,
        url: url,
        uploaded_type: type,
        filename: filename || url.split('/').pop(),
        method: 'external_url',
        message: 'URL externe enregistrée'
      }, { headers: corsHeaders });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // ========== ADMIN LOGIN ==========
  if (path === '/admin/login') {
    try {
      const body = await request.json();
      const { email, password } = body;
      
      console.log(`🔐 Tentative connexion: ${email}`);
      
      if (!email || !password) {
        return NextResponse.json({
          success: false,
          error: 'Email et mot de passe requis'
        }, { status: 400, headers: corsHeaders });
      }
      
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier si la collection admins existe
        const collExists = await db.listCollections({ name: 'admins' }).hasNext();
        
        if (!collExists) {
          // Créer admin par défaut
          const hashedPassword = await bcrypt.hash('admin123', 10);
          const defaultAdmin = {
            id: uuidv4(),
            name: 'Administrateur',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'superadmin',
            createdAt: new Date()
          };
          
          await db.createCollection('admins');
          await db.collection('admins').insertOne(defaultAdmin);
          
          console.log('✅ Collection admins créée avec utilisateur par défaut');
        }
        
        // Chercher l'utilisateur
        const admin = await db.collection('admins').findOne({ email });
        
        if (!admin) {
          return NextResponse.json({
            success: false,
            error: 'Identifiants incorrects',
            suggestion: process.env.NODE_ENV === 'development' ? 
              'Essayez avec admin@example.com / admin123' : undefined
          }, { status: 401, headers: corsHeaders });
        }
        
        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, admin.password);
        
        if (!isValidPassword) {
          return NextResponse.json({
            success: false,
            error: 'Identifiants incorrects'
          }, { status: 401, headers: corsHeaders });
        }
        
        // Connexion réussie
        return NextResponse.json({
          success: true,
          user: {
            id: admin.id || admin._id.toString(),
            name: admin.name,
            email: admin.email,
            role: admin.role || 'admin'
          },
          token: uuidv4(), // Token temporaire
          message: 'Connexion réussie'
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      console.error('❌ Erreur login:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur de connexion'
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // ========== CRÉATION DE LIVRE ==========
  if (path === '/books') {
    try {
      const body = await request.json();
      const { client, db } = await getDbConnection();
      
      try {
        const book = {
          id: uuidv4(),
          ...body,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Validation minimale
        if (!book.title || !book.author) {
          return NextResponse.json({
            success: false,
            error: 'Titre et auteur requis'
          }, { status: 400, headers: corsHeaders });
        }
        
        await db.collection('books').insertOne(book);
        
        return NextResponse.json({
          success: true,
          book,
          message: 'Livre créé avec succès'
        }, { status: 201, headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      console.error('❌ Erreur création livre:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur création livre'
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // ========== CHAT AI ==========
  if (path === '/chat') {
    try {
      const body = await request.json();
      const { messages } = body;
      
      if (!messages || !Array.isArray(messages)) {
        return NextResponse.json({
          success: false,
          error: 'Messages requis'
        }, { status: 400, headers: corsHeaders });
      }
      
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({
          success: false,
          error: 'Service AI non configuré',
          instructions: 'Ajoutez OPENAI_API_KEY dans les variables d\'environnement'
        }, { status: 500, headers: corsHeaders });
      }
      
      const result = await streamText({
        model: openai('gpt-3.5-turbo'),
        messages: messages,
        temperature: 0.7,
        maxTokens: 500
      });
      
      const stream = result.toTextStreamResponse();
      
      return new Response(stream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur chat:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur communication AI'
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // ========== CRÉATION ADMIN (backdoor) ==========
  if (path === '/create-admin') {
    try {
      const body = await request.json();
      const { name, email, password } = body;
      
      // Vérification en production
      if (process.env.NODE_ENV === 'production') {
        const secret = body.secret;
        if (secret !== process.env.ADMIN_SECRET) {
          return NextResponse.json({
            success: false,
            error: 'Accès non autorisé'
          }, { status: 403, headers: corsHeaders });
        }
      }
      
      if (!name || !email || !password) {
        return NextResponse.json({
          success: false,
          error: 'Nom, email et mot de passe requis'
        }, { status: 400, headers: corsHeaders });
      }
      
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier si l'email existe déjà
        const existingAdmin = await db.collection('admins').findOne({ email });
        if (existingAdmin) {
          return NextResponse.json({
            success: false,
            error: 'Un admin avec cet email existe déjà'
          }, { status: 400, headers: corsHeaders });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = {
          id: uuidv4(),
          name,
          email,
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.collection('admins').insertOne(admin);
        
        return NextResponse.json({
          success: true,
          message: 'Admin créé avec succès',
          admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role
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
  
  // Route non trouvée
  return NextResponse.json({
    success: false,
    error: 'Route non trouvée'
  }, { status: 404, headers: corsHeaders });
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
        
        // Vérifier existence
        const existingBook = await db.collection('books').findOne({ id });
        if (!existingBook) {
          return NextResponse.json({
            success: false,
            error: 'Livre non trouvé'
          }, { status: 404, headers: corsHeaders });
        }
        
        const updateData = {
          ...body,
          updatedAt: new Date()
        };
        
        // Ne pas modifier certaines propriétés
        delete updateData.id;
        delete updateData._id;
        delete updateData.createdAt;
        
        const result = await db.collection('books').updateOne(
          { id },
          { $set: updateData }
        );
        
        if (result.modifiedCount === 0) {
          return NextResponse.json({
            success: false,
            error: 'Aucune modification'
          }, { status: 400, headers: corsHeaders });
        }
        
        const updatedBook = await db.collection('books').findOne({ id });
        
        return NextResponse.json({
          success: true,
          book: updatedBook,
          message: 'Livre mis à jour'
        }, { headers: corsHeaders });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Route non trouvée'
      }, { status: 404, headers: corsHeaders });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`❌ PUT Error ${path}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500, headers: corsHeaders });
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
        
        const result = await db.collection('books').deleteOne({ id });
        
        if (result.deletedCount === 1) {
          return NextResponse.json({
            success: true,
            message: 'Livre supprimé'
          }, { headers: corsHeaders });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Livre non trouvé'
          }, { status: 404, headers: corsHeaders });
        }
      }
      
      return NextResponse.json({
        success: false,
        error: 'Route non trouvée'
      }, { status: 404, headers: corsHeaders });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error(`❌ DELETE Error ${path}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Erreur serveur'
    }, { status: 500, headers: corsHeaders });
  }
}
