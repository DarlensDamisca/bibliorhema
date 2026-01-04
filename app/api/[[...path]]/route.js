import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { put } from '@vercel/blob';
import { pipeline } from 'stream/promises';

// Utiliser l'URI de l'environnement ou la valeur par défaut (pour le dev local)
const defaultUri = "mongodb+srv://biblio_db_user:rCeHHjhzP0KZpuaT@cluster0.gjsk6tp.mongodb.net";
const uri = process.env.MONGODB_URI || defaultUri;
const dbName = "immersive_library";

// Pour le développement serverless sur Vercel, on utilise une connexion par requête
// plutôt qu'un cache global qui pourrait causer des problèmes

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Handler OPTIONS pour CORS
export async function OPTIONS(request) {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Fonction de connexion à MongoDB optimisée pour Vercel
async function getDbConnection() {
  console.log('Connecting to MongoDB...');
  console.log('Using URI:', process.env.MONGODB_URI ? 'From env' : 'Default');
  
  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 10000, // 10 secondes timeout
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    await client.connect();
    const db = client.db(dbName);
    
    // Test de la connexion
    await db.command({ ping: 1 });
    console.log('MongoDB connection successful');
    
    return { client, db };
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

// Handler GET
export async function GET(request) {
  console.log('GET request to:', request.url);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Has OpenAI Key:', !!process.env.OPENAI_API_KEY);
  
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';
  
  // Route de test pour vérifier la connexion
  if (path === '/test') {
    try {
      const { db, client } = await getDbConnection();
      const bookCount = await db.collection('books').countDocuments({});
      const categories = await db.collection('books').distinct('category');
      
      await client.close();
      
      return NextResponse.json({
        success: true,
        message: 'API is working',
        environment: process.env.NODE_ENV,
        database: {
          connected: true,
          bookCount,
          categoryCount: categories.length
        },
        services: {
          hasOpenAI: !!process.env.OPENAI_API_KEY,
          hasBlobToken: !!process.env.BLOB_READ_WRITE_TOKEN,
          corsOrigin: process.env.CORS_ORIGINS || '*'
        }
      }, { headers: corsHeaders });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        environment: process.env.NODE_ENV,
        hasMongoUri: !!process.env.MONGODB_URI,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }

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
      endpoints: [
        'GET /api/books',
        'GET /api/books/:id',
        'GET /api/categories',
        'GET /api/authors',
        'POST /api/books',
        'POST /api/admin/login',
        'POST /api/upload',
        'POST /api/chat',
        'GET /api/test'
      ]
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('GET Error:', error);
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing client:', closeError);
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
  console.log('POST request to:', request.url);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  // Handle file upload
  if (path === '/upload') {
    try {
      // Vérifier le token Blob
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json(
          { success: false, error: 'Service de stockage non configuré' },
          { status: 500, headers: corsHeaders }
        );
      }

      const formData = await request.formData();
      const file = formData.get('file');
      const type = formData.get('type');

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
            size: file.size
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const filename = `${uuidv4()}${ext}`;

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
          contentType: file.type
        },
        { headers: corsHeaders }
      );
    } catch (error) {
      console.error('Upload error:', error);
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

  // Pour les autres routes POST, lire le JSON du body
  try {
    const body = await request.json();
    let client;
    
    try {
      const { client: dbClient, db } = await getDbConnection();
      client = dbClient;

      // Admin login
      if (path === '/admin/login') {
        const { email, password } = body;

        if (!email || !password) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Email et mot de passe requis' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Chercher l'admin dans la base de données
        const admin = await db.collection('admins').findOne({ email });

        if (!admin) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Identifiants invalides' },
            { status: 401, headers: corsHeaders }
          );
        }

        // Vérifier le mot de passe
        const isValidPassword = await bcrypt.compare(password, admin.password);

        if (!isValidPassword) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Identifiants invalides' },
            { status: 401, headers: corsHeaders }
          );
        }

        // Retourner les infos de l'admin (sans le mot de passe)
        await client.close();
        return NextResponse.json(
          { 
            success: true, 
            user: { 
              id: admin.id || admin._id,
              name: admin.name,
              email: admin.email,
              role: admin.role || 'admin'
            } 
          },
          { headers: corsHeaders }
        );
      }

      // Create book
      if (path === '/books') {
        const book = {
          id: uuidv4(),
          ...body,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.collection('books').insertOne(book);
        await client.close();
        
        return NextResponse.json({ 
          success: true, 
          book 
        }, { status: 201, headers: corsHeaders });
      }

      // Chat with AI
      if (path === '/chat') {
        const { messages } = body;

        if (!messages || messages.length === 0) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Messages requis' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Vérifier la clé OpenAI
        if (!process.env.OPENAI_API_KEY) {
          await client.close();
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

          await client.close();
          
          // Convert the result to a readable stream
          const stream = result.toTextStreamResponse();
          
          // Créer une réponse avec les headers CORS
          const response = new Response(stream.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              ...corsHeaders,
            },
          });
          
          return response;
        } catch (aiError) {
          console.error('Chat AI error:', aiError);
          await client.close();
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

      // Si aucune route ne correspond
      await client.close();
      return NextResponse.json(
        { success: false, error: 'Route non trouvée' },
        { status: 404, headers: corsHeaders }
      );

    } catch (dbError) {
      console.error('Database error:', dbError);
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError);
        }
      }
      throw dbError;
    }

  } catch (error) {
    console.error('POST Error:', error);
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
  console.log('PUT request to:', request.url);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    const body = await request.json();
    let client;
    
    try {
      const { client: dbClient, db } = await getDbConnection();
      client = dbClient;

      // Update book
      if (path.startsWith('/books/')) {
        const id = path.split('/')[2];
        
        // Vérifier si le livre existe
        const existingBook = await db.collection('books').findOne({ id });
        if (!existingBook) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Livre non trouvé' },
            { status: 404, headers: corsHeaders }
          );
        }

        const updateData = {
          ...body,
          updatedAt: new Date(),
        };
        
        // Ne pas permettre la modification de l'ID
        delete updateData.id;
        delete updateData._id;
        delete updateData.createdAt;

        const result = await db.collection('books').updateOne(
          { id },
          { $set: updateData }
        );

        if (result.modifiedCount === 0) {
          await client.close();
          return NextResponse.json(
            { success: false, error: 'Aucune modification effectuée' },
            { status: 400, headers: corsHeaders }
          );
        }

        const book = await db.collection('books').findOne({ id });
        await client.close();
        
        return NextResponse.json({ 
          success: true, 
          book 
        }, { headers: corsHeaders });
      }

      // Si aucune route ne correspond
      await client.close();
      return NextResponse.json(
        { success: false, error: 'Route non trouvée' },
        { status: 404, headers: corsHeaders }
      );

    } catch (dbError) {
      console.error('Database error:', dbError);
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          console.error('Error closing client:', closeError);
        }
      }
      throw dbError;
    }

  } catch (error) {
    console.error('PUT Error:', error);
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
  console.log('DELETE request to:', request.url);
  
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  let client;
  try {
    const { client: dbClient, db } = await getDbConnection();
    client = dbClient;

    // Delete book
    if (path.startsWith('/books/')) {
      const id = path.split('/')[2];
      
      // Vérifier si le livre existe
      const existingBook = await db.collection('books').findOne({ id });
      if (!existingBook) {
        await client.close();
        return NextResponse.json(
          { success: false, error: 'Livre non trouvé' },
          { status: 404, headers: corsHeaders }
        );
      }

      const result = await db.collection('books').deleteOne({ id });
      
      await client.close();
      
      if (result.deletedCount === 1) {
        return NextResponse.json({ 
          success: true, 
          message: 'Livre supprimé avec succès' 
        }, { headers: corsHeaders });
      } else {
        return NextResponse.json(
          { success: false, error: 'Échec de la suppression' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Si aucune route ne correspond
    await client.close();
    return NextResponse.json(
      { success: false, error: 'Route non trouvée' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('DELETE Error:', error);
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing client:', closeError);
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
