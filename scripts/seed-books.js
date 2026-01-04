const { MongoClient } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const uri = process.env.MONGO_URL || 'mongodb://localhost:27017';
const dbName = process.env.DB_NAME || 'immersive_library';

const sampleBooks = [
  {
    id: uuidv4(),
    title: "L'Alchimiste",
    author: "Paulo Coelho",
    category: "Fiction",
    year: 1988,
    description: "Un jeune berger andalou part à la recherche d'un trésor enfoui au pied des Pyramides. Dans le désert, initié par l'alchimiste, il apprendra à écouter son cœur.",
    coverImage: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
    pdfUrl: "/books/alchimiste.pdf",
    audioUrl: "/audio/alchimiste.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "1984",
    author: "George Orwell",
    category: "Science-Fiction",
    year: 1949,
    description: "Dans un futur totalitaire, Winston Smith tente de préserver son humanité face à Big Brother qui surveille tout et manipule la vérité.",
    coverImage: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400&h=600&fit=crop",
    pdfUrl: "/books/1984.pdf",
    audioUrl: "/audio/1984.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Le Petit Prince",
    author: "Antoine de Saint-Exupéry",
    category: "Conte",
    year: 1943,
    description: "L'histoire d'un petit prince qui voyage de planète en planète à la recherche du sens de la vie et de l'amitié.",
    coverImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop",
    pdfUrl: "/books/petit-prince.pdf",
    audioUrl: "/audio/petit-prince.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Harry Potter à l'école des sorciers",
    author: "J.K. Rowling",
    category: "Fantastique",
    year: 1997,
    description: "Harry Potter découvre qu'il est un sorcier le jour de ses 11 ans et entre à Poudlard, l'école de sorcellerie.",
    coverImage: "https://images.unsplash.com/photo-1621351183012-e2f9972dd9bf?w=400&h=600&fit=crop",
    pdfUrl: "/books/harry-potter-1.pdf",
    audioUrl: "/audio/harry-potter-1.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Les Misérables",
    author: "Victor Hugo",
    category: "Classique",
    year: 1862,
    description: "L'histoire de Jean Valjean, ancien forçat, qui cherche à se racheter dans la France du XIXe siècle.",
    coverImage: "https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=400&h=600&fit=crop",
    pdfUrl: "/books/miserables.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Sapiens",
    author: "Yuval Noah Harari",
    category: "Histoire",
    year: 2011,
    description: "Une brève histoire de l'humanité, de l'âge de pierre à l'ère moderne, explorant comment Homo sapiens a dominé le monde.",
    coverImage: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=600&fit=crop",
    pdfUrl: "/books/sapiens.pdf",
    audioUrl: "/audio/sapiens.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Le Seigneur des Anneaux",
    author: "J.R.R. Tolkien",
    category: "Fantastique",
    year: 1954,
    description: "L'épopée de Frodon et de la Communauté de l'Anneau pour détruire l'Anneau Unique et sauver la Terre du Milieu.",
    coverImage: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=600&fit=crop",
    pdfUrl: "/books/lotr.pdf",
    audioUrl: "/audio/lotr.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "L'Étranger",
    author: "Albert Camus",
    category: "Philosophie",
    year: 1942,
    description: "L'histoire de Meursault, un homme indifférent qui commet un meurtre et affronte l'absurdité de l'existence.",
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400&h=600&fit=crop",
    pdfUrl: "/books/etranger.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Dune",
    author: "Frank Herbert",
    category: "Science-Fiction",
    year: 1965,
    description: "Sur la planète désertique Arrakis, Paul Atreides doit affronter son destin pour sauver sa famille et son peuple.",
    coverImage: "https://images.unsplash.com/photo-1618154683155-d5649840a48e?w=400&h=600&fit=crop",
    pdfUrl: "/books/dune.pdf",
    audioUrl: "/audio/dune.mp3",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Orgueil et Préjugés",
    author: "Jane Austen",
    category: "Romance",
    year: 1813,
    description: "L'histoire d'Elizabeth Bennet et de Mr. Darcy, deux personnalités qui doivent surmonter leurs préjugés pour trouver l'amour.",
    coverImage: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=600&fit=crop",
    pdfUrl: "/books/orgueil-prejuges.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "L'Art de la Guerre",
    author: "Sun Tzu",
    category: "Philosophie",
    year: -500,
    description: "Traité de stratégie militaire chinois, devenu une référence en management et en stratégie d'entreprise.",
    coverImage: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=600&fit=crop",
    pdfUrl: "/books/art-guerre.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    title: "Crime et Châtiment",
    author: "Fiodor Dostoïevski",
    category: "Classique",
    year: 1866,
    description: "L'histoire de Raskolnikov, un étudiant qui commet un meurtre et lutte avec sa conscience.",
    coverImage: "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&h=600&fit=crop",
    pdfUrl: "/books/crime-chatiment.pdf",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedDatabase() {
  let client;

  try {
    console.log('🔌 Connexion à MongoDB...');
    client = await MongoClient.connect(uri);
    const db = client.db(dbName);

    console.log('🗑️  Suppression des anciennes données...');
    await db.collection('books').deleteMany({});

    console.log('📚 Insertion des livres d\'exemple...');
    await db.collection('books').insertMany(sampleBooks);

    console.log(`✅ ${sampleBooks.length} livres ajoutés avec succès!`);
    console.log('\n📖 Livres disponibles:');
    sampleBooks.forEach((book, index) => {
      console.log(`   ${index + 1}. ${book.title} - ${book.author} (${book.category})`);
    });

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connexion fermée');
    }
  }
}

seedDatabase();
