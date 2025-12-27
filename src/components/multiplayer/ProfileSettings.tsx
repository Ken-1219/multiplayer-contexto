'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, User, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { validateNickname, AVATAR_COLORS, type AvatarColor } from '@/types/multiplayer';
import AnimatedButton from '@/components/ui/AnimatedButton';
import AnimatedInput from '@/components/ui/AnimatedInput';

interface ProfileSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { colors } = useTheme();
  const { player, isLoading, updateProfile, logout } = useMultiplayer();

  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Initialize form with current player data
  useEffect(() => {
    if (player && isOpen) {
      setNickname(player.nickname);
      setSelectedColor(player.avatarColor as AvatarColor);
      setNicknameError(null);
      setShowLogoutConfirm(false);
    }
  }, [player, isOpen]);

  const handleSave = async () => {
    if (!player) return;

    // Validate nickname
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setNicknameError(validation.error || 'Invalid nickname');
      return;
    }

    // Check if anything changed
    const nicknameChanged = nickname.trim() !== player.nickname;
    const colorChanged = selectedColor !== player.avatarColor;

    if (!nicknameChanged && !colorChanged) {
      onClose();
      return;
    }

    try {
      await updateProfile(
        nicknameChanged ? nickname.trim() : undefined,
        colorChanged ? selectedColor : undefined
      );
      onClose();
    } catch {
      // Error handled by context
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
    } catch {
      // Error handled by context
    }
  };

  if (!player) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md rounded-2xl backdrop-blur-xl overflow-hidden"
            style={{
              backgroundColor: colors.cardBg,
              border: `1px solid ${colors.cardBorder}`,
              boxShadow: `0 0 40px rgba(0, 0, 0, 0.5)`,
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: colors.cardBorder }}
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" style={{ color: colors.primary }} />
                <h2 className="text-lg font-bold" style={{ color: colors.textPrimary }}>
                  Profile Settings
                </h2>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-lg cursor-pointer"
                style={{ color: colors.textMuted }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Avatar Preview */}
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  key={selectedColor}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                  style={{
                    backgroundColor: selectedColor,
                    boxShadow: `0 4px 20px ${selectedColor}50`,
                  }}
                >
                  {nickname[0]?.toUpperCase() || '?'}
                </motion.div>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Your avatar
                </p>
              </div>

              {/* Nickname Input */}
              <div>
                <label
                  className="text-sm font-medium mb-2 block"
                  style={{ color: colors.textSecondary }}
                >
                  Nickname
                </label>
                <AnimatedInput
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameError(null);
                  }}
                  placeholder="Enter your nickname"
                  maxLength={20}
                  error={nicknameError || undefined}
                />
                {!nicknameError && (
                  <p className="text-xs mt-2" style={{ color: colors.textMuted }}>
                    2-20 characters, letters, numbers, underscores, hyphens only
                  </p>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label
                  className="text-sm font-medium mb-3 block"
                  style={{ color: colors.textSecondary }}
                >
                  Avatar Color
                </label>
                <div className="grid grid-cols-8 gap-3">
                  {AVATAR_COLORS.map((color) => (
                    <motion.button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className="w-8 h-8 rounded-full cursor-pointer relative"
                      style={{
                        backgroundColor: color,
                        boxShadow: selectedColor === color
                          ? `0 0 0 3px ${colors.cardBg}, 0 0 0 5px ${color}`
                          : undefined,
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selectedColor === color && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <AnimatedButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  glow
                  onClick={handleSave}
                  isLoading={isLoading}
                >
                  Save Changes
                </AnimatedButton>

                {/* Logout Section */}
                <AnimatePresence mode="wait">
                  {!showLogoutConfirm ? (
                    <motion.div
                      key="logout-button"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <AnimatedButton
                        variant="ghost"
                        size="md"
                        fullWidth
                        onClick={() => setShowLogoutConfirm(true)}
                        leftIcon={<LogOut className="w-4 h-4" />}
                        style={{ color: colors.error }}
                      >
                        Logout
                      </AnimatedButton>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="logout-confirm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl space-y-3"
                      style={{
                        backgroundColor: colors.errorBg,
                        border: `1px solid ${colors.error}30`,
                      }}
                    >
                      <p className="text-sm text-center" style={{ color: colors.error }}>
                        Are you sure? You&apos;ll need to create a new profile.
                      </p>
                      <div className="flex gap-2">
                        <AnimatedButton
                          variant="ghost"
                          size="sm"
                          fullWidth
                          onClick={() => setShowLogoutConfirm(false)}
                        >
                          Cancel
                        </AnimatedButton>
                        <AnimatedButton
                          variant="danger"
                          size="sm"
                          fullWidth
                          onClick={handleLogout}
                          isLoading={isLoading}
                        >
                          Logout
                        </AnimatedButton>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
