'use client';

import { useState } from 'react';
import { Card, CardBody, Button, Input, Spinner } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useMultiplayer } from '@/contexts/MultiplayerContext';
import { validateNickname, AVATAR_COLORS, type AvatarColor } from '@/types/multiplayer';

export default function MultiplayerLobbyPage() {
  const router = useRouter();
  const { player, isLoading, error, createPlayer, clearError } = useMultiplayer();

  const [nickname, setNickname] = useState('');
  const [selectedColor, setSelectedColor] = useState<AvatarColor>(AVATAR_COLORS[0]);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  const handleCreatePlayer = async () => {
    // Validate nickname
    const validation = validateNickname(nickname);
    if (!validation.valid) {
      setNicknameError(validation.error || 'Invalid nickname');
      return;
    }

    setNicknameError(null);
    clearError();

    try {
      await createPlayer(nickname, selectedColor);
    } catch {
      // Error is handled by context
    }
  };

  // Show nickname setup if no player
  if (!player) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
        {/* Back button */}
        <Button
          variant="light"
          className="absolute top-4 left-4 text-slate-400"
          onPress={() => router.push('/')}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Profile</h1>
          <p className="text-slate-400">Choose a nickname to play multiplayer</p>
        </div>

        <Card className="w-full max-w-md bg-slate-800/50 border border-slate-700">
          <CardBody className="p-6 space-y-6">
            {/* Nickname Input */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Nickname</label>
              <Input
                aria-label="Nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                isInvalid={!!nicknameError}
                errorMessage={nicknameError}
                variant="bordered"
                classNames={{
                  input: 'text-white',
                  inputWrapper: 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 data-[hover=true]:bg-slate-700',
                }}
              />
              <p className="text-xs text-slate-500 mt-1">
                2-20 characters, letters, numbers, underscores, hyphens only
              </p>
            </div>

            {/* Avatar Color Selection */}
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Choose your color</label>
              <div className="grid grid-cols-8 gap-2">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      selectedColor === color
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit button */}
            <Button
              color="primary"
              size="lg"
              className="w-full"
              onPress={handleCreatePlayer}
              isLoading={isLoading}
            >
              Continue
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Show Create/Join options
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Back button */}
      <Button
        variant="light"
        className="absolute top-4 left-4 text-slate-400"
        onPress={() => router.push('/')}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>

      {/* Player info */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full"
          style={{ backgroundColor: player.avatarColor }}
        />
        <span className="text-white font-medium">{player.nickname}</span>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Multiplayer</h1>
        <p className="text-slate-400">Create a new game or join an existing one</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Create Game */}
        <Card
          isPressable
          onPress={() => router.push('/multiplayer/create')}
          className="bg-slate-800/50 border border-slate-700 hover:border-blue-500 transition-all"
        >
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">Create Game</h2>
                <p className="text-slate-400 text-sm">Host a new room and invite a friend</p>
              </div>
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardBody>
        </Card>

        {/* Join Game */}
        <Card
          isPressable
          onPress={() => router.push('/multiplayer/join')}
          className="bg-slate-800/50 border border-slate-700 hover:border-emerald-500 transition-all"
        >
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-white">Join Game</h2>
                <p className="text-slate-400 text-sm">Enter a room code to join</p>
              </div>
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </CardBody>
        </Card>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
    </div>
  );
}
