'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check } from 'lucide-react';
import { useTheme, themes, type ThemeType } from '@/contexts/ThemeContext';

const themeOptions: { id: ThemeType; icon: string }[] = [
  { id: 'emerald', icon: '🌿' },
  { id: 'purple', icon: '💜' },
  { id: 'ocean', icon: '🌊' },
  { id: 'charcoal', icon: '🌑' },
];

export default function ThemeToggle() {
  const { theme, colors, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
        }}
      >
        <Palette
          className="w-4 h-4"
          style={{ color: colors.primary }}
        />
        <span
          className="text-sm font-medium hidden sm:inline"
          style={{ color: colors.textSecondary }}
        >
          {themes[theme].name}
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 z-50 p-2 rounded-xl shadow-2xl backdrop-blur-xl min-w-[160px]"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: `1px solid ${colors.cardBorder}`,
              }}
            >
              {themeOptions.map((option, index) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setTheme(option.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group"
                  style={{
                    backgroundColor: theme === option.id ? themes[option.id].cardBg : 'transparent',
                  }}
                  whileHover={{
                    backgroundColor: themes[option.id].cardBg,
                    x: 2,
                  }}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span
                    className="text-sm font-medium flex-1 text-left"
                    style={{
                      color: theme === option.id
                        ? themes[option.id].primary
                        : themes[option.id].textSecondary
                    }}
                  >
                    {themes[option.id].name}
                  </span>
                  {theme === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    >
                      <Check
                        className="w-4 h-4"
                        style={{ color: themes[option.id].primary }}
                      />
                    </motion.div>
                  )}
                  {/* Color preview dot */}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: themes[option.id].primary }}
                  />
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
