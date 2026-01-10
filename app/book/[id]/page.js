'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, MessageSquare, Loader2, Send, Menu, X, Maximize2, Minimize2, Search, ZoomIn, ZoomOut, Download, Sun, Moon, ChevronLeft, ChevronRight, Grid, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import AudioPlayer from '@/components/AudioPlayer';

// Import React PDF Viewer
import { Viewer, Worker, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { pageNavigationPlugin } from '@react-pdf-viewer/page-navigation';
import { searchPlugin } from '@react-pdf-viewer/search';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import { thumbnailPlugin } from '@react-pdf-viewer/thumbnail';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/page-navigation/lib/styles/index.css';
import '@react-pdf-viewer/search/lib/styles/index.css';
import '@react-pdf-viewer/zoom/lib/styles/index.css';
import '@react-pdf-viewer/thumbnail/lib/styles/index.css';

export default function BookPage({ params }) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedBooks, setRelatedBooks] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [scale, setScale] = useState(1.0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [viewerHeight, setViewerHeight] = useState('calc(100vh - 8rem)');
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Références
  const viewerRef = useRef(null);
  const searchInputRef = useRef(null);
  const pdfContainerRef = useRef(null);
  const mainContainerRef = useRef(null);
  const relatedBooksRef = useRef(null);
  
  // Plugins React PDF Viewer
  const thumbnailPluginInstance = thumbnailPlugin();
  const pageNavigationPluginInstance = pageNavigationPlugin();
  const searchPluginInstance = searchPlugin({
    keyword: searchKeyword,
  });
  const zoomPluginInstance = zoomPlugin();
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [],
    toolbarPlugin: {
      fullScreenPlugin: {
        onEnterFullScreen: () => setIsFullscreen(true),
        onExitFullScreen: () => setIsFullscreen(false),
      },
      searchPlugin: {
        keyword: searchKeyword,
      },
    },
  });

  const plugins = [
    defaultLayoutPluginInstance,
    pageNavigationPluginInstance,
    searchPluginInstance,
    zoomPluginInstance,
    thumbnailPluginInstance,
  ];

  useEffect(() => {
    fetchBook();
    
    const calculateHeight = () => {
      const headerHeight = 64;
      const mainPadding = 24;
      const availableHeight = window.innerHeight - headerHeight - mainPadding;
      setViewerHeight(`${availableHeight}px`);
    };
    
    calculateHeight();
    window.addEventListener('resize', calculateHeight);
    
    return () => window.removeEventListener('resize', calculateHeight);
  }, [params.id]);

  useEffect(() => {
    if (book && book.category) {
      fetchRelatedBooks();
    }
  }, [book]);

  useEffect(() => {
    const calculateHeight = () => {
      const headerHeight = 64;
      const mainPadding = 24;
      const availableHeight = window.innerHeight - headerHeight - mainPadding;
      setViewerHeight(`${availableHeight}px`);
    };
    
    calculateHeight();
  }, [showSidebar]);

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/books/${params.id}`);
      const data = await res.json();
      if (data.book) {
        setBook(data.book);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedBooks = async () => {
    if (!book?.category) return;
    
    setLoadingRelated(true);
    try {
      const params = new URLSearchParams({
        category: book.category,
        exclude: book.id,
        limit: '10'
      });

      const res = await fetch(`/api/books?${params.toString()}`);
      const data = await res.json();
      setRelatedBooks(data.books || []);
    } catch (error) {
      console.error('Erreur lors du chargement des livres similaires:', error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant expert. L'utilisateur lit actuellement "${book?.title}" de ${book?.author}. Réponds en français de manière concise et pertinente.`
            },
            ...newMessages
          ]
        })
      });

      if (!res.ok) {
        throw new Error(`Erreur API: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Stream non disponible');
      }

      const decoder = new TextDecoder();
      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              break;
            }
            
            if (data) {
              try {
                const json = JSON.parse(data);
                if (json.type === 'text-delta' && json.text) {
                  assistantMessage += json.text;
                } else if (json.type === 'error') {
                  throw new Error(json.text || 'Erreur de l\'IA');
                }
              } catch (e) {
                console.warn('Failed to parse chunk:', e, 'Data:', data);
              }
            }
          }
        }

        setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
      }
    } catch (error) {
      console.error('Erreur chat:', error);
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: `Désolé, une erreur est survenue: ${error.message}` 
      }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handlePageChange = (e) => {
    setCurrentPage(e.currentPage + 1);
  };

  const handleDocumentLoad = (e) => {
    setTotalPages(e.doc.numPages);
  };

  const handleZoom = (newScale) => {
    setScale(newScale);
  };

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      setShowSearch(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchKeyword.trim()) {
      handleSearch();
    }
    if (e.key === 'Escape') {
      setShowSearch(false);
      setSearchKeyword('');
    }
  };

  useEffect(() => {
    if (!showSearch) {
      setSearchKeyword('');
    }
  }, [showSearch]);

  const nextSlide = () => {
    if (relatedBooks.length <= 6) return;
    const maxSlides = Math.ceil(relatedBooks.length / 6) - 1;
    setCurrentSlide(prev => prev < maxSlides ? prev + 1 : prev);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => prev > 0 ? prev - 1 : 0);
  };

  const getCurrentSlideBooks = () => {
    const startIndex = currentSlide * 6;
    const endIndex = startIndex + 6;
    return relatedBooks.slice(startIndex, endIndex);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Chargement du livre...</p>
        </motion.div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">Livre non trouvé</h2>
          <Link href="/">
            <Button className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl bg-background/95 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="shrink-0">
                  <ArrowLeft className="w-4 h-4 lg:mr-2" />
                  <span className="hidden lg:inline">Retour</span>
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm lg:text-xl font-bold truncate">{book.title}</h1>
                <p className="text-xs text-muted-foreground truncate hidden sm:block">Par {book.author}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{book.category}</Badge>
                {book.year && <Badge variant="outline" className="text-xs">{book.year}</Badge>}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="hidden lg:flex"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div ref={mainContainerRef} className="container mx-auto px-0 lg:px-4 py-4 lg:py-6">
        <div className={`grid ${isFullscreen ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-3'} gap-4 lg:gap-6`}>
          
          {/* PDF Viewer */}
          <div className={`${isFullscreen ? 'col-span-1' : 'lg:col-span-2'} order-1`}>
            <motion.div layout className="relative">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
                <CardContent className="p-0">
                  {book.pdfUrl ? (
                    <div className="flex flex-col">
                      {/* Barre de contrôles */}
                      <div className="p-3 border-b bg-background/80 backdrop-blur-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-center gap-4">
                            <div className="hidden md:block">
                              <div className="text-sm font-semibold truncate max-w-[200px]">
                                {book.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Page {currentPage} sur {totalPages}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const prevPage = Math.max(1, currentPage - 1);
                                  setCurrentPage(prevPage);
                                }}
                                disabled={currentPage <= 1}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              
                              <Input
                                type="number"
                                value={currentPage}
                                onChange={(e) => {
                                  const page = parseInt(e.target.value);
                                  if (!isNaN(page) && page >= 1 && page <= totalPages) {
                                    setCurrentPage(page);
                                  }
                                }}
                                className="w-16 h-8 text-center"
                                min={1}
                                max={totalPages}
                              />
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const nextPage = Math.min(totalPages, currentPage + 1);
                                  setCurrentPage(nextPage);
                                }}
                                disabled={currentPage >= totalPages}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Recherche */}
                            <div className="relative">
                              {showSearch ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                  <Input
                                    ref={searchInputRef}
                                    placeholder="Rechercher..."
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-48 h-8"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    onClick={handleSearch}
                                    disabled={!searchKeyword.trim()}
                                    className="h-8"
                                  >
                                    OK
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowSearch(false)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setShowSearch(true);
                                    setTimeout(() => {
                                      searchInputRef.current?.focus();
                                    }, 100);
                                  }}
                                  className="h-8 gap-2"
                                >
                                  <Search className="w-4 h-4" />
                                  <span className="hidden sm:inline">Rechercher</span>
                                </Button>
                              )}
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowThumbnails(!showThumbnails)}
                              className="h-8 w-8 p-0"
                              title="Miniatures"
                            >
                              <Grid className="w-4 h-4" />
                            </Button>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => zoomPluginInstance.zoomOut()}
                                className="h-8 w-8 p-0"
                                title="Zoom arrière"
                              >
                                <ZoomOut className="w-4 h-4" />
                              </Button>
                              
                              <span className="text-sm font-medium w-12 text-center">
                                {Math.round(scale * 100)}%
                              </span>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => zoomPluginInstance.zoomIn()}
                                className="h-8 w-8 p-0"
                                title="Zoom avant"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                              className="h-8 w-8 p-0"
                              title="Changer le thème"
                            >
                              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = book.pdfUrl;
                                link.download = `${book.title}.pdf`;
                                link.click();
                              }}
                              className="h-8 w-8 p-0"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-primary to-secondary"
                              initial={{ width: 0 }}
                              animate={{ width: `${(currentPage / (totalPages || 1)) * 100}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Conteneur PDF */}
                      <div className="flex" style={{ height: viewerHeight }}>
                        <AnimatePresence>
                          {showThumbnails && (
                            <motion.div
                              initial={{ width: 0, opacity: 0 }}
                              animate={{ width: '200px', opacity: 1 }}
                              exit={{ width: 0, opacity: 0 }}
                              className="border-r bg-background overflow-auto flex-shrink-0"
                            >
                              <div className="p-3">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold">Miniatures</h3>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowThumbnails(false)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                    <button
                                      key={pageNum}
                                      onClick={() => setCurrentPage(pageNum)}
                                      className={`w-full p-2 border rounded text-left hover:bg-muted transition-colors ${
                                        currentPage === pageNum
                                          ? 'border-primary bg-primary/10'
                                          : 'border-border'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs">
                                          {pageNum}
                                        </div>
                                        <span className="text-sm">Page {pageNum}</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        
                        <div 
                          ref={pdfContainerRef}
                          className="relative bg-muted/30 flex-1 overflow-hidden"
                          style={{ height: '100%' }}
                        >
                          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                            <Viewer
                              fileUrl={book.pdfUrl}
                              plugins={plugins}
                              onPageChange={handlePageChange}
                              onDocumentLoad={handleDocumentLoad}
                              onZoom={handleZoom}
                              defaultScale={SpecialZoomLevel.PageFit}
                              theme={{
                                theme: theme,
                              }}
                              renderError={(error) => (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                  <BookOpen className="w-16 h-16 text-destructive mb-4" />
                                  <h3 className="text-xl font-semibold mb-2">Erreur de chargement du PDF</h3>
                                  <p className="text-muted-foreground mb-4">{error.message}</p>
                                  <Button variant="outline" onClick={() => window.location.reload()}>
                                    Recharger
                                  </Button>
                                </div>
                              )}
                              renderLoader={(percentages) => (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                                  <div className="text-center">
                                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                      Chargement du PDF... {percentages}%
                                    </p>
                                  </div>
                                </div>
                              )}
                            />
                          </Worker>
                        </div>
                      </div>

                      <div className="p-2 border-t bg-background/50">
                        <p className="text-xs text-muted-foreground text-center">
                          💡 <kbd className="px-2 py-1 bg-background rounded border">Ctrl+F</kbd> Recherche native • 
                          <kbd className="px-2 py-1 bg-background rounded border mx-2">↑ ↓</kbd> Navigation • 
                          <kbd className="px-2 py-1 bg-background rounded border mx-2">+ -</kbd> Zoom • 
                          <kbd className="px-2 py-1 bg-background rounded border mx-2">F</kbd> Plein écran
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-20 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg" style={{ height: viewerHeight }}>
                      <div className="text-center">
                        <BookOpen className="w-16 h-16 mx-auto text-primary mb-4" />
                        <h3 className="text-xl font-semibold mb-2">PDF non disponible</h3>
                        <p className="text-muted-foreground">Le fichier PDF n'a pas été téléchargé</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar - Chat IA */}
          <AnimatePresence>
            {(showSidebar || window.innerWidth >= 1024) && !isFullscreen && (
              <motion.div
                initial={{ opacity: 0, x: 300 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 300 }}
                transition={{ duration: 0.3 }}
                className={`${showSidebar ? 'fixed inset-0 z-40 lg:relative' : 'hidden lg:block'} lg:col-span-1 order-2`}
              >
                {showSidebar && (
                  <div 
                    className="lg:hidden absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowSidebar(false)}
                  />
                )}
                
                <div className={`${showSidebar ? 'absolute right-0 top-0 h-full w-[85vw] sm:w-96' : ''} lg:relative lg:w-full h-full flex flex-col`}>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 bg-card/50 backdrop-blur-sm flex-shrink-0">
                      <TabsTrigger value="chat" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden sm:inline">Chat IA / Audio</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="h-full mt-8 flex-1 flex flex-col min-h-0">
                      <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-lg flex-1 flex flex-col min-h-0">
                        <CardContent className="p-4 h-full flex flex-col min-h-0">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b flex-shrink-0">
                            <MessageSquare className="w-5 h-5 text-primary" />
                            <span className="font-semibold">Assistant AI</span>
                          </div>

                          <div className="flex-1 overflow-hidden min-h-0">
                            <ScrollArea className="h-full pr-4">
                              {messages.length === 0 ? (
                                <div className="text-center py-8">
                                  <p className="text-sm text-muted-foreground mb-4">
                                    Posez des questions sur le livre !
                                  </p>
                                  <div className="space-y-2 text-xs text-muted-foreground">
                                    <p>💡 "Résume ce chapitre"</p>
                                    <p>💡 "Qui sont les personnages ?"</p>
                                    <p>💡 "Explique ce passage"</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {messages.map((msg, idx) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`p-3 rounded-lg ${
                                        msg.role === 'user'
                                          ? 'bg-primary text-primary-foreground ml-4'
                                          : 'bg-muted mr-4'
                                      }`}
                                    >
                                      <ReactMarkdown className="text-sm prose prose-sm dark:prose-invert max-w-none">
                                        {msg.content}
                                      </ReactMarkdown>
                                    </motion.div>
                                  ))}
                                  {isLoadingChat && (
                                    <div className="flex gap-1 p-3 bg-muted rounded-lg mr-4">
                                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </ScrollArea>
                          </div>

                          <form onSubmit={sendMessage} className="flex gap-2 mt-4 pt-3 border-t flex-shrink-0">
                            <Input
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Votre question..."
                              disabled={isLoadingChat}
                              className="flex-1"
                            />
                            <Button 
                              type="submit" 
                              disabled={isLoadingChat || !input.trim()} 
                              size="icon"
                              className="shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </form>
                        </CardContent>
                      </Card>

                      {book.audioUrl && (
                        <div className="h-full mt-4 flex-1 flex flex-col min-h-0">
                          <AudioPlayer audioUrl={book.audioUrl} title={book.title} />
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

       {/* SECTION LIVRES DE LA MÊME CATÉGORIE */}
{!isFullscreen && relatedBooks.length > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.3 }}
    ref={relatedBooksRef}
    className="mt-12"
  >
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Livres de la même catégorie
        </h2>
        <p className="text-sm text-muted-foreground">
          Découvrez d'autres livres dans "{book?.category}"
        </p>
      </div>
      
      <Link href={`/?category=${encodeURIComponent(book?.category || '')}`}>
        <Button variant="outline" size="sm" className="gap-2">
          <ExternalLink className="w-4 h-4" />
          Voir plus
        </Button>
      </Link>
    </div>

    {loadingRelated ? (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    ) : (
      <div className="relative">
        {/* Navigation buttons */}
        {relatedBooks.length > 6 && (
          <>
            <Button
              variant="outline"
              size="icon"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-background/80 backdrop-blur-sm"
              onClick={prevSlide}
              disabled={currentSlide === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-background/80 backdrop-blur-sm"
              onClick={nextSlide}
              disabled={currentSlide >= Math.ceil(relatedBooks.length / 6) - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Books grid */}
        <div className="overflow-hidden">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {getCurrentSlideBooks().map((relatedBook) => (
              <Link 
                key={relatedBook.id || relatedBook._id} 
                href={`/book/${relatedBook.id || relatedBook._id}`}
                className="group"
              >
                <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] overflow-hidden">
                  <CardContent className="p-4 h-full flex flex-col">
                    <div className="flex-1">
                      <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                        {relatedBook.coverUrl || relatedBook.cover ? (
                          <div className="relative w-full h-full">
                            <img
                              src={relatedBook.coverUrl || relatedBook.cover}
                              alt={relatedBook.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                // Si l'image ne se charge pas, afficher une icône
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                  <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                                    <BookOpen class="w-12 h-12 text-primary/60" />
                                  </div>
                                `;
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                            <BookOpen className="w-12 h-12 text-primary/60" />
                          </div>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {relatedBook.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {relatedBook.author}
                      </p>
                    </div>
                    
                    <Badge variant="secondary" className="text-xs w-fit">
                      {relatedBook.category}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </motion.div>
        </div>

        {/* Slide indicators */}
        {relatedBooks.length > 6 && (
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: Math.ceil(relatedBooks.length / 6) }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? 'bg-primary w-6' 
                    : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
                aria-label={`Aller au slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    )}
  </motion.div>
)}
      </div>
    </div>
  );
}
