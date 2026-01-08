'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, BookOpen, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
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

  useEffect(() => {
    fetchCategories();
    fetchAuthors();
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, searchQuery, selectedCategory, selectedAuthor]);

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
