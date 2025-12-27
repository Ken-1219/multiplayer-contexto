'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface AnimatedButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  glow?: boolean;
}

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  glow = false,
  className,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const { colors } = useTheme();

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-base gap-2',
    lg: 'px-6 py-3.5 text-lg gap-2.5',
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: `linear-gradient(135deg, ${colors.gradientFrom}, ${colors.gradientTo})`,
          color: '#ffffff',
          border: 'none',
          boxShadow: glow ? `0 4px 20px ${colors.accentGlow}` : undefined,
        };
      case 'secondary':
        return {
          background: colors.cardBg,
          color: colors.textPrimary,
          border: `1px solid ${colors.cardBorder}`,
        };
      case 'outline':
        return {
          background: 'transparent',
          color: colors.primary,
          border: `1px solid ${colors.primary}`,
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: colors.textSecondary,
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          background: colors.errorBg,
          color: colors.error,
          border: `1px solid ${colors.error}40`,
        };
      default:
        return {};
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <motion.button
      className={cn(
        'relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent',
        sizeStyles[size],
        fullWidth && 'w-full',
        (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        ...variantStyles,
        // @ts-expect-error focus ring color
        '--tw-ring-color': colors.primary,
      }}
      whileHover={!disabled && !isLoading ? {
        scale: 1.03,
        boxShadow: `0 6px 25px ${colors.accentGlow}`,
      } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.97 } : undefined}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
        </motion.div>
      )}

      <motion.span
        className={cn(
          'flex items-center justify-center gap-2',
          isLoading && 'opacity-0'
        )}
      >
        {leftIcon && (
          <motion.span
            initial={{ x: -5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {leftIcon}
          </motion.span>
        )}
        {children}
        {rightIcon && (
          <motion.span
            initial={{ x: 5, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {rightIcon}
          </motion.span>
        )}
      </motion.span>
    </motion.button>
  );
}
