'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'subtle';
  glow?: boolean;
  hover?: boolean;
}

export default function GlassCard({
  children,
  className,
  variant = 'default',
  glow = false,
  hover = true,
  ...props
}: GlassCardProps) {
  const { colors } = useTheme();

  const variants = {
    default: {
      backgroundColor: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
    },
    elevated: {
      backgroundColor: `rgba(0, 0, 0, 0.4)`,
      border: `1px solid ${colors.cardBorder}`,
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3)`,
    },
    subtle: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid rgba(255, 255, 255, 0.05)`,
    },
  };

  return (
    <motion.div
      className={cn(
        'rounded-xl backdrop-blur-md transition-all duration-300',
        className
      )}
      style={{
        ...variants[variant],
        ...(glow && {
          boxShadow: `0 0 40px ${colors.accentGlow}`,
        }),
      }}
      whileHover={hover ? {
        scale: 1.01,
        borderColor: colors.cardHoverBorder,
      } : undefined}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
