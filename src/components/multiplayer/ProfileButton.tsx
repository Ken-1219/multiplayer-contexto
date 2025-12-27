'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import ProfileSettings from './ProfileSettings';

export default function ProfileButton() {
  const { colors } = useTheme();
  const { player } = useMultiplayer();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!player) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsSettingsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200"
        style={{
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
        }}
      >
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{
            backgroundColor: player.avatarColor,
            boxShadow: `0 0 8px ${player.avatarColor}50`,
          }}
        >
          {player.nickname[0].toUpperCase()}
        </div>
        <span
          className="text-sm font-medium hidden sm:inline max-w-[100px] truncate"
          style={{ color: colors.textSecondary }}
        >
          {player.nickname}
        </span>
      </motion.button>

      <ProfileSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
