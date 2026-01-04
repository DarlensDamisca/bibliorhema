// route.js - Version corrigée avec upload fonctionnel
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

// Handler OPTIONS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Fonction de connexion MongoDB
async function getDbConnection() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI non configuré');
  }
  
  try {
    const client = new MongoClient(mongoUri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    const dbName = mongoUri.split('/').pop().split('?')[0] || 'immersive_library';
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    console.error('MongoDB error:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Handler GET
export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  // Route de test
  if (path === '/test') {
    try {
      return NextResponse.json({
        success: true,
        message: 'API fonctionnelle',
        environment: {
          has_mongodb: !!process.env.MONGODB_URI,
          has_openai: !!process.env.OPENAI_API_KEY,
          has_blob: !!process.env.BLOB_READ_WRITE_TOKEN,
          node_env: process.env.NODE_ENV
        },
        endpoints: {
          test: 'GET /api/test',
          upload: 'POST /api/upload (form-data avec "file" et "type")',
          login: 'POST /api/admin/login',
          books: 'GET /api/books'
        }
      }, { headers: corsHeaders });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  try {
    const { client, db } = await getDbConnection();
    
    // ... autres routes GET existantes ...
    
    await client.close();
    return NextResponse.json({
      success: true,
      message: 'API Bibliothèque Immersive'
    }, { headers: corsHeaders });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500, headers: corsHeaders });
  }
}

// Handler POST avec upload corrigé
export async function POST(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  console.log(`POST request to: ${path}`);
  
  // Route upload
  if (path === '/upload') {
    try {
      console.log('📤 Début de l\'upload');
      
      // Vérifier si Blob est configuré
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        console.log('⚠️ BLOB_READ_WRITE_TOKEN non configuré');
        return NextResponse.json({
          success: false,
          error: 'Service de stockage non configuré',
          instructions: 'Ajoutez BLOB_READ_WRITE_TOKEN dans les variables d\'environnement Vercel',
          alternative: 'Vous pouvez utiliser /api/upload-local en développement'
        }, { status: 500, headers: corsHeaders });
      }
      
      // Récupérer le formData
      const formData = await request.formData();
      console.log('FormData reçu');
      
      const file = formData.get('file');
      const type = formData.get('type') || 'cover';
      
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'Aucun fichier fourni',
          received_fields: Array.from(formData.keys())
        }, { status: 400, headers: corsHeaders });
      }
      
      console.log('Fichier reçu:', {
        name: file.name,
        type: file.type,
        size: file.size,
        type_param: type
      });
      
      // Types de fichiers autorisés
      const validTypes = {
        book: ['application/pdf'],
        cover: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
        audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
      };
      
      // Vérifier le type
      const allowedTypes = validTypes[type];
      if (!allowedTypes) {
        return NextResponse.json({
          success: false,
          error: `Type "${type}" invalide`,
          valid_types: Object.keys(validTypes)
        }, { status: 400, headers: corsHeaders });
      }
      
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          success: false,
          error: `Type de fichier non autorisé pour "${type}"`,
          received_type: file.type,
          allowed_types: allowedTypes
        }, { status: 400, headers: corsHeaders });
      }
      
      // Vérifier la taille (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return NextResponse.json({
          success: false,
          error: 'Fichier trop volumineux',
          max_size_mb: 50,
          file_size_mb: (file.size / (1024 * 1024)).toFixed(2)
        }, { status: 400, headers: corsHeaders });
      }
      
      // Convertir en buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Générer un nom de fichier unique
      const extension = file.name.split('.').pop() || 
        (file.type.includes('image') ? 'jpg' : 
         file.type.includes('pdf') ? 'pdf' : 
         file.type.includes('audio') ? 'mp3' : 'bin');
      
      const filename = `${type}-${uuidv4()}.${extension}`;
      
      console.log('Upload vers Vercel Blob:', filename);
      
      // Upload vers Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      
      console.log('✅ Upload réussi:', blob.url);
      
      return NextResponse.json({
        success: true,
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        filename: filename,
        size: file.size,
        type: file.type,
        uploaded_type: type
      }, { headers: corsHeaders });
      
    } catch (error) {
      console.error('❌ Erreur upload:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur lors de l\'upload',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Route upload alternative (pour développement sans Vercel Blob)
  if (path === '/upload-local' && process.env.NODE_ENV === 'development') {
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
      
      // Simuler un upload réussi
      const fakeUrl = `https://example.com/uploads/${type}/${uuidv4()}-${file.name}`;
      
      return NextResponse.json({
        success: true,
        url: fakeUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        message: 'Upload simulé (mode développement)',
        note: 'En production, utilisez Vercel Blob avec BLOB_READ_WRITE_TOKEN'
      }, { headers: corsHeaders });
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Admin login
  if (path === '/admin/login') {
    try {
      const body = await request.json();
      const { email, password } = body;
      
      if (!email || !password) {
        return NextResponse.json({
          success: false,
          error: 'Email et mot de passe requis'
        }, { status: 400, headers: corsHeaders });
      }
      
      const { client, db } = await getDbConnection();
      
      try {
        // Vérifier/créer la collection admins
        const colls = await db.listCollections({ name: 'admins' }).toArray();
        if (colls.length === 0) {
          await db.createCollection('admins');
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await db.collection('admins').insertOne({
            id: uuidv4(),
            name: 'Admin',
            email: 'admin@example.com',
            password: hashedPassword,
            role: 'admin',
            createdAt: new Date()
          });
        }
        
        // Chercher l'admin
        const admin = await db.collection('admins').findOne({ email });
        
        if (!admin) {
          return NextResponse.json({
            success: false,
            error: 'Identifiants invalides'
          }, { status: 401, headers: corsHeaders });
        }
        
        // Vérifier le mot de passe
        const isValid = await bcrypt.compare(password, admin.password);
        
        if (!isValid) {
          return NextResponse.json({
            success: false,
            error: 'Identifiants invalides'
          }, { status: 401, headers: corsHeaders });
        }
        
        return NextResponse.json({
          success: true,
          user: {
            id: admin.id || admin._id.toString(),
            name: admin.name,
            email: admin.email,
            role: admin.role
          }
        }, { headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      console.error('Login error:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur de connexion'
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Créer un livre
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
        
        await db.collection('books').insertOne(book);
        
        return NextResponse.json({
          success: true,
          book: book
        }, { status: 201, headers: corsHeaders });
        
      } finally {
        await client.close();
      }
      
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Chat AI
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
          error: 'OpenAI API key non configurée'
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
      console.error('Chat error:', error);
      return NextResponse.json({
        success: false,
        error: 'Erreur AI'
      }, { status: 500, headers: corsHeaders });
    }
  }
  
  // Route non trouvée
  return NextResponse.json({
    success: false,
    error: 'Route non trouvée'
  }, { status: 404, headers: corsHeaders });
}

// Handlers PUT et DELETE (inchangés)
export async function PUT(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  try {
    const body = await request.json();
    const { client, db } = await getDbConnection();
    
    try {
      if (path.startsWith('/books/')) {
        const id = path.split('/')[2];
        const updateData = { ...body, updatedAt: new Date() };
        delete updateData.id;
        delete updateData._id;
        
        await db.collection('books').updateOne(
          { id },
          { $set: updateData }
        );
        
        const book = await db.collection('books').findOne({ id });
        return NextResponse.json({ success: true, book }, { headers: corsHeaders });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Route non trouvée'
      }, { status: 404, headers: corsHeaders });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  try {
    const { client, db } = await getDbConnection();
    
    try {
      if (path.startsWith('/books/')) {
        const id = path.split('/')[2];
        await db.collection('books').deleteOne({ id });
        return NextResponse.json({ success: true }, { headers: corsHeaders });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Route non trouvée'
      }, { status: 404, headers: corsHeaders });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500, headers: corsHeaders });
  }
}
