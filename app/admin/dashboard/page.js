'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Layers, Plus, Edit, Trash2, ArrowLeft, LogOut, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SpotlightBackground from '@/components/SpotlightBackground';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ totalBooks: 0, totalCategories: 0, totalAuthors: 0 });
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [uploading, setUploading] = useState({ cover: false, pdf: false, audio: false });
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    year: '',
    description: '',
    coverImage: '',
    pdfUrl: '',
    audioUrl: ''
  });

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (!admin) {
      router.push('/admin');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, booksRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/books?limit=1000')
      ]);

      const statsData = await statsRes.json();
      const booksData = await booksRes.json();

      setStats(statsData.stats || { totalBooks: 0, totalCategories: 0, totalAuthors: 0 });
      setBooks(booksData.books || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin');
    router.push('/admin');
  };

  const handleOpenDialog = (book = null) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        category: book.category,
        year: book.year?.toString() || '',
        description: book.description || '',
        coverImage: book.coverImage || '',
        pdfUrl: book.pdfUrl || '',
        audioUrl: book.audioUrl || ''
      });
    } else {
      setEditingBook(null);
      setFormData({
        title: '',
        author: '',
        category: '',
        year: '',
        description: '',
        coverImage: '',
        pdfUrl: '',
        audioUrl: ''
      });
    }
    setShowDialog(true);
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    setUploading({ ...uploading, [type]: true });

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', type);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        
        if (type === 'cover') {
          setFormData({ ...formData, coverImage: data.url });
        } else if (type === 'book') {
          setFormData({ ...formData, pdfUrl: data.url });
        } else if (type === 'audio') {
          setFormData({ ...formData, audioUrl: data.url });
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Erreur lors de l upload');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l upload du fichier');
    } finally {
      setUploading({ ...uploading, [type]: false });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          year: formData.year ? parseInt(formData.year) : null
        })
      });

      if (res.ok) {
        setShowDialog(false);
        fetchData();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce livre ?')) return;

    try {
      await fetch(`/api/books/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <SpotlightBackground />

      <div className="relative z-10">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/50 sticky top-0 z-20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Accueil
                  </Button>
                </Link>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Dashboard Admin
                </h1>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Deconnexion
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Total Livres</CardTitle>
                    <BookOpen className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalBooks}</div>
                  <p className="text-xs text-muted-foreground mt-1">Dans la bibliotheque</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                    <Layers className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalCategories}</div>
                  <p className="text-xs text-muted-foreground mt-1">Differentes categories</p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-all group">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Auteurs</CardTitle>
                    <Users className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalAuthors}</div>
                  <p className="text-xs text-muted-foreground mt-1">Auteurs differents</p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestion des Livres</CardTitle>
                  <CardDescription>Ajoutez, modifiez ou supprimez des livres</CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouveau Livre
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {books.map((book) => (
                  <motion.div
                    key={book.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-4 p-4 border border-border/50 rounded-lg hover:border-primary/50 transition-all"
                  >
                    <div className="w-16 h-20 bg-gradient-to-br from-primary/20 to-secondary/20 rounded flex-shrink-0 overflow-hidden">
                      {book.coverImage ? (
                        <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{book.title}</h3>
                      <p className="text-sm text-muted-foreground">Par {book.author}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">{book.category}</Badge>
                        {book.year && <Badge variant="outline" className="text-xs">{book.year}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenDialog(book)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(book.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBook ? 'Modifier le livre' : 'Nouveau livre'}</DialogTitle>
            <DialogDescription>Remplissez les informations et téléchargez les fichiers</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titre *</label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Auteur *</label>
                <Input value={formData.author} onChange={(e) => setFormData({ ...formData, author: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categorie *</label>
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Annee</label>
                <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Fichiers
              </h3>

              <div className="space-y-2">
                <label className="text-sm font-medium">Image de couverture *</label>
                <div className="flex gap-2">
                  <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'cover')} disabled={uploading.cover} />
                  {uploading.cover && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {formData.coverImage && <div className="flex items-center gap-2 text-sm text-green-600">✓ Fichier telecharge: {formData.coverImage}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier PDF *</label>
                <div className="flex gap-2">
                  <Input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e.target.files[0], 'book')} disabled={uploading.pdf} />
                  {uploading.pdf && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {formData.pdfUrl && <div className="flex items-center gap-2 text-sm text-green-600">✓ Fichier telecharge: {formData.pdfUrl}</div>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fichier Audio (optionnel)</label>
                <div className="flex gap-2">
                  <Input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files[0], 'audio')} disabled={uploading.audio} />
                  {uploading.audio && <Loader2 className="w-5 h-5 animate-spin" />}
                </div>
                {formData.audioUrl && <div className="flex items-center gap-2 text-sm text-green-600">✓ Fichier telecharge: {formData.audioUrl}</div>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Annuler</Button>
              <Button type="submit" disabled={!formData.coverImage || !formData.pdfUrl || uploading.cover || uploading.pdf || uploading.audio}>
                {editingBook ? 'Mettre a jour' : 'Creer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
