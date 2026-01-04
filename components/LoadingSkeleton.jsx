'use client';

import { motion } from 'framer-motion';

export default function LoadingSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[...Array(count)].map((_, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: idx * 0.05 }}
          className="relative group"
        >
          <div className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-lg overflow-hidden">
            <div className="p-6">
              {/* Image placeholder */}
              <div className="w-full h-64 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg mb-4 animate-pulse" />
              
              {/* Title */}
              <div className="h-6 bg-muted rounded w-3/4 mb-3 animate-pulse" />
              
              {/* Author */}
              <div className="h-4 bg-muted rounded w-1/2 mb-3 animate-pulse" />
              
              {/* Badges */}
              <div className="flex gap-2">
                <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                <div className="h-5 bg-muted rounded w-12 animate-pulse" />
              </div>
              
              {/* Description */}
              <div className="mt-3 space-y-2">
                <div className="h-3 bg-muted rounded w-full animate-pulse" />
                <div className="h-3 bg-muted rounded w-5/6 animate-pulse" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}