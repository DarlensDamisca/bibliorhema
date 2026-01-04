import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { writeFile } from 'fs/promises';
import nodePath from 'path';
import { put } from '@vercel/blob';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(uri, {
    maxPoolSize: 10,
    minPoolSize: 2,
  });

  const db = client.db(dbName);
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
  const { pathname, searchParams } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    const { db } = await connectToDatabase();

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

      return NextResponse.json({
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
      
      if (!book) {
        return NextResponse.json(
          { error: 'Livre non trouvé' },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json({ book }, { headers: corsHeaders });
    }

    // Get categories
    if (path === '/categories') {
      const categories = await db.collection('books').distinct('category');
      return NextResponse.json({ categories }, { headers: corsHeaders });
    }

    // Get authors
    if (path === '/authors') {
      const authors = await db.collection('books').distinct('author');
      return NextResponse.json({ authors }, { headers: corsHeaders });
    }

    // Get stats for admin
    if (path === '/admin/stats') {
      const totalBooks = await db.collection('books').countDocuments();
      const categories = await db.collection('books').distinct('category');
      const authors = await db.collection('books').distinct('author');

      return NextResponse.json({
        stats: {
          totalBooks,
          totalCategories: categories.length,
          totalAuthors: authors.length,
        }
      }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { message: 'Bienvenue sur l\'API Bibliothèque Immersive' },
      { headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    // Handle file upload
    if (path === '/upload') {
      const formData = await request.formData();
      const file = formData.get('file');
      const type = formData.get('type');

      if (!file) {
        return NextResponse.json(
          { error: 'Aucun fichier fourni' },
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
          { error: 'Type de fichier invalide' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'Fichier trop volumineux (max 50MB)' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Convert file to buffer
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Generate unique filename
      const ext = nodePath.extname(file.name);
      const filename = `${uuidv4()}${ext}`;

      // Upload to Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.type,
      });

      return NextResponse.json(
        { 
          url: blob.url, 
          filename, 
          size: file.size,
          contentType: file.type
        },
        { headers: corsHeaders }
      );
    }

    // Pour toutes les autres routes POST, lire le JSON du body
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Admin login
    if (path === '/admin/login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { error: 'Email et mot de passe requis' },
          { status: 400, headers: corsHeaders }
        );
      }

      // Chercher l'admin dans la base de données
      const admin = await db.collection('admins').findOne({ email });

      if (!admin) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Vérifier le mot de passe
      const isValidPassword = await bcrypt.compare(password, admin.password);

      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Identifiants invalides' },
          { status: 401, headers: corsHeaders }
        );
      }

      // Retourner les infos de l'admin (sans le mot de passe)
      return NextResponse.json(
        { 
          success: true, 
          user: { 
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role 
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
      return NextResponse.json({ book }, { status: 201, headers: corsHeaders });
    }

    // Chat with AI
    if (path === '/chat') {
      const { messages } = body;

      if (!messages || messages.length === 0) {
        return NextResponse.json(
          { error: 'Messages requis' },
          { status: 400, headers: corsHeaders }
        );
      }

      try {
        const result = await streamText({
          model: openai('gpt-4-turbo'),
          messages: messages,
          temperature: 0.7,
          maxTokens: 1000,
        });

        // Convert the result to a readable stream
        const stream = result.toTextStreamResponse();
        
        return new Response(stream.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            ...corsHeaders,
          },
        });
      } catch (error) {
        console.error('Chat AI error:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la communication avec l\'IA' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Si aucune route ne correspond
    return NextResponse.json(
      { error: 'Route non trouvée' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    const body = await request.json();
    const { db } = await connectToDatabase();

    // Update book
    if (path.startsWith('/books/')) {
      const id = path.split('/')[2];
      const updateData = {
        ...body,
        updatedAt: new Date(),
      };
      delete updateData.id;
      delete updateData._id;

      await db.collection('books').updateOne(
        { id },
        { $set: updateData }
      );

      const book = await db.collection('books').findOne({ id });
      return NextResponse.json({ book }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { error: 'Route non trouvée' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request) {
  const { pathname } = new URL(request.url);
  const path = pathname.replace('/api', '') || '/';

  try {
    const { db } = await connectToDatabase();

    // Delete book
    if (path.startsWith('/books/')) {
      const id = path.split('/')[2];
      await db.collection('books').deleteOne({ id });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json(
      { error: 'Route non trouvée' },
      { status: 404, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Erreur API:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}