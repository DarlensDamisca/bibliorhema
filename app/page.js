'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, BookOpen, Sparkles, ChevronLeft, ChevronRight, X, Volume2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SpotlightCard from '@/components/SpotlightCard';
import SpotlightBackground from '@/components/SpotlightBackground';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import Link from 'next/link';

export default function Home() {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAuthor, setSelectedAuthor] = useState('all');
  
  // Nouveaux états pour la section publicitaire
  const [featuredBooks, setFeaturedBooks] = useState([]);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const [showFeaturedSection, setShowFeaturedSection] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchAuthors();
    fetchFeaturedBooks();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, searchQuery, selectedCategory, selectedAuthor]);

  // Timer pour changer le livre mis en avant automatiquement
  useEffect(() => {
    if (featuredBooks.length > 1 && showFeaturedSection) {
      const interval = setInterval(() => {
        setCurrentFeaturedIndex((prevIndex) => 
          prevIndex === featuredBooks.length - 1 ? 0 : prevIndex + 1
        );
      }, 8000); // Change toutes les 8 secondes

      return () => clearInterval(interval);
    }
  }, [featuredBooks, showFeaturedSection]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedAuthor !== 'all') params.append('author', selectedAuthor);

      const res = await fetch(`/api/books?${params.toString()}`);
      const data = await res.json();
      
      setBooks(data.books || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error('Erreur lors du chargement des livres:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedBooks = async () => {
    try {
      // On récupère des livres au hasard pour la section publicitaire
      const res = await fetch('/api/books?limit=5&random=true');
      const data = await res.json();
      setFeaturedBooks(data.books || []);
    } catch (error) {
      console.error('Erreur lors du chargement des livres mis en avant:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error);
    }
  };

  const fetchAuthors = async () => {
    try {
      const res = await fetch('/api/authors');
      const data = await res.json();
      setAuthors(data.authors || []);
    } catch (error) {
      console.error('Erreur lors du chargement des auteurs:', error);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedAuthor('all');
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextFeaturedBook = () => {
    setCurrentFeaturedIndex((prevIndex) => 
      prevIndex === featuredBooks.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevFeaturedBook = () => {
    setCurrentFeaturedIndex((prevIndex) => 
      prevIndex === 0 ? featuredBooks.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="min-h-screen relative">
      {/* Spotlight Background */}
      <SpotlightBackground />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/50 sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <BookOpen className="w-8 h-8 text-primary" />
                  <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Bibliothèque Rhêma
                  </h1>
                  <p className="text-xs text-muted-foreground">Découvrez une nouvelle façon de lire</p>
                </div>
              </div>
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Section Publicitaire - Livres en vedette */}
        {showFeaturedSection && featuredBooks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border-y border-border/50"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
                  </div>
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                    DÉCOUVERTE DU MOMENT
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeaturedSection(false)}
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevFeaturedBook}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex-1 px-4">
                  <motion.div
                    key={currentFeaturedIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col md:flex-row items-center justify-center gap-4"
                  >
                    <div className="relative">
                      <div className="w-16 h-20 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shadow-md">
                        <BookOpen className="w-8 h-8 text-primary/70" />
                      </div>
                      {featuredBooks[currentFeaturedIndex]?.type === 'audio' && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                          <Volume2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center md:text-left max-w-md">
                      <h3 className="font-bold text-lg truncate">
                        {featuredBooks[currentFeaturedIndex]?.title || 'Livre en vedette'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        par {featuredBooks[currentFeaturedIndex]?.author || 'Auteur inconnu'}
                      </p>
                      <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {featuredBooks[currentFeaturedIndex]?.category || 'Général'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {featuredBooks[currentFeaturedIndex]?.rating || '4.5'} ⭐
                        </span>
                      </div>
                      <p className="text-sm mt-2 line-clamp-2">
                        {featuredBooks[currentFeaturedIndex]?.description || 
                         'Découvrez ce livre exceptionnel dès maintenant !'}
                      </p>
                    </div>
                  </motion.div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={nextFeaturedBook}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Indicateurs de progression */}
              <div className="flex justify-center gap-1 mt-4">
                {featuredBooks.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFeaturedIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentFeaturedIndex 
                        ? 'bg-primary w-6' 
                        : 'bg-border hover:bg-primary/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
              Explorez Notre Collection
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Une expérience de lecture sans pareil
            </p>
          </motion.div>

          {/* Filters Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 space-y-4"
          >
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher un livre, auteur..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="pl-10 h-12 bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary transition-all"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filtres:</span>
              </div>

              <Select value={selectedCategory} onValueChange={(value) => {
                setSelectedCategory(value);
                setPagination({ ...pagination, page: 1 });
              }}>
                <SelectTrigger className="w-[180px] bg-card/50 backdrop-blur-sm border-border/50">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedAuthor} onValueChange={(value) => {
                setSelectedAuthor(value);
                setPagination({ ...pagination, page: 1 });
              }}>
                <SelectTrigger className="w-[180px] bg-card/50 backdrop-blur-sm border-border/50">
                  <SelectValue placeholder="Auteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les auteurs</SelectItem>
                  {authors.map((author) => (
                    <SelectItem key={author} value={author}>{author}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(searchQuery || selectedCategory !== 'all' || selectedAuthor !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Réinitialiser
                </Button>
              )}
            </div>

            {/* Active Filters */}
            {(searchQuery || selectedCategory !== 'all' || selectedAuthor !== 'all') && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {searchQuery && (
                  <Badge variant="secondary">
                    Recherche: {searchQuery}
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary">
                    Catégorie: {selectedCategory}
                  </Badge>
                )}
                {selectedAuthor !== 'all' && (
                  <Badge variant="secondary">
                    Auteur: {selectedAuthor}
                  </Badge>
                )}
              </div>
            )}
          </motion.div>

          {/* Books Grid */}
          {loading ? (
            <LoadingSkeleton count={12} />
          ) : books.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Aucun livre trouvé</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== 'all' || selectedAuthor !== 'all'
                  ? 'Essayez de modifier vos filtres'
                  : 'La bibliothèque est vide pour le moment'}
              </p>
              {(searchQuery || selectedCategory !== 'all' || selectedAuthor !== 'all') && (
                <Button onClick={clearFilters} variant="outline">
                  Réinitialiser les filtres
                </Button>
              )}
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {books.map((book, index) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <SpotlightCard book={book} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-center gap-2 mt-12"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages)].map((_, idx) => {
                      const pageNum = idx + 1;
                      // Show first page, last page, current page and adjacent pages
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                      ) {
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === pagination.page ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      } else if (
                        pageNum === pagination.page - 2 ||
                        pageNum === pagination.page + 2
                      ) {
                        return <span key={pageNum} className="px-2 text-muted-foreground">...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNext}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {/* Results Info */}
              <div className="text-center mt-8">
                <p className="text-sm text-muted-foreground">
                  Affichage de {((pagination.page - 1) * pagination.limit) + 1} à{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total}{' '}
                  livre{pagination.total > 1 ? 's' : ''}
                </p>
              </div>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 mt-20 py-8 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Copyright © {new Date().getFullYear()} Bibliothèque Rhêma •
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
