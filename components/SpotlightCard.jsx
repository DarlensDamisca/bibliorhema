'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function SpotlightCard({ book }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePosition({ x, y });
  };

  return (
    <Link href={`/book/${book.id}`}>
      <motion.div
        ref={cardRef}
        className="relative group cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-border transition-all duration-300">
          {/* Spotlight Effect */}
          {isHovering && (
            <div
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle 200px at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 80%)`,
              }}
            />
          )}

          <CardContent className="p-6 relative z-10">
            {/* Cover Image */}
            <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
              {book.coverImage ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setImageLoaded(true)}
                    loading="lazy"
                  />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Book Info */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {book.title}
              </h3>
              
              <p className="text-sm text-muted-foreground">
                Par {book.author}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {book.category}
                </Badge>
                {book.year && (
                  <Badge variant="outline" className="text-xs">
                    {book.year}
                  </Badge>
                )}
              </div>

              {book.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {book.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}