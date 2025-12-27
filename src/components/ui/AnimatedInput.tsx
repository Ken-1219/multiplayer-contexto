'use client';

import { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  isLoading?: boolean;
  error?: string;
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ className, isLoading, error, label, leftIcon, rightIcon, ...props }, ref) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <motion.label
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="block text-sm font-medium mb-2"
            style={{ color: colors.textSecondary }}
          >
            {label}
          </motion.label>
        )}

        <motion.div
          className="relative"
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Glow effect on focus */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute -inset-0.5 rounded-xl blur-sm pointer-events-none"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}40, ${colors.accent}40)`,
                }}
              />
            )}
          </AnimatePresence>

          <div className="relative">
            {leftIcon && (
              <div
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
                style={{ color: isFocused ? colors.primary : colors.textMuted }}
              >
                {leftIcon}
              </div>
            )}

            <input
              ref={ref}
              className={cn(
                'w-full rounded-xl text-center font-medium transition-all duration-300',
                'focus:outline-none',
                leftIcon && 'pl-12',
                rightIcon && 'pr-12',
                className
              )}
              style={{
                backgroundColor: colors.inputBg,
                border: `2px solid ${error ? colors.error : isFocused ? colors.inputFocusBorder : colors.inputBorder}`,
                color: colors.textPrimary,
                padding: '1rem 1.5rem',
                fontSize: '1.125rem',
              }}
              onFocus={(e) => {
                setIsFocused(true);
                props.onFocus?.(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                props.onBlur?.(e);
              }}
              {...props}
            />

            {/* Right side - loading spinner or icon */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, rotate: -180 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 180 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2
                      className="w-5 h-5 animate-spin"
                      style={{ color: colors.primary }}
                    />
                  </motion.div>
                ) : rightIcon ? (
                  <motion.div
                    key="icon"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{ color: colors.textMuted }}
                  >
                    {rightIcon}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="mt-2 text-sm"
              style={{ color: colors.error }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

AnimatedInput.displayName = 'AnimatedInput';

export default AnimatedInput;
