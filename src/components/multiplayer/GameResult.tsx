'use client';

import { Modal, ModalContent, ModalBody, Button } from '@nextui-org/react';
import { type GamePlayer } from '@/types/multiplayer';

interface GameResultProps {
  isOpen: boolean;
  isWinner: boolean;
  winner: GamePlayer | null;
  secretWord: string;
  myGuessCount: number;
  opponentGuessCount: number;
  onExit: () => void;
}

export default function GameResult({
  isOpen,
  isWinner,
  winner,
  secretWord,
  myGuessCount,
  opponentGuessCount,
  onExit,
}: GameResultProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onExit}
      hideCloseButton
      isDismissable={false}
      classNames={{
        base: 'bg-slate-800 border border-slate-700',
        body: 'py-6',
      }}
    >
      <ModalContent>
        <ModalBody className="text-center">
          {/* Result Icon & Text */}
          {isWinner ? (
            <>
              <div className="text-6xl mb-4">
                <span role="img" aria-label="trophy">&#127942;</span>
              </div>
              <h2 className="text-3xl font-bold text-emerald-400 mb-2">
                You Win!
              </h2>
              <p className="text-slate-400">
                Congratulations! You found the word!
              </p>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">
                <span role="img" aria-label="disappointed">&#128549;</span>
              </div>
              <h2 className="text-3xl font-bold text-red-400 mb-2">
                You Lost
              </h2>
              <p className="text-slate-400">
                {winner?.nickname || 'Your opponent'} found the word first!
              </p>
            </>
          )}

          {/* Secret Word */}
          <div className="mt-6 mb-4">
            <p className="text-slate-400 text-sm mb-2">The secret word was:</p>
            <div className="bg-slate-700/50 px-6 py-3 rounded-lg inline-block">
              <span className="text-2xl font-bold text-white uppercase tracking-wider">
                {secretWord}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 my-6">
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <p className="text-slate-400 text-sm">Your guesses</p>
              <p className="text-2xl font-bold text-white">{myGuessCount}</p>
            </div>
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <p className="text-slate-400 text-sm">Opponent guesses</p>
              <p className="text-2xl font-bold text-white">{opponentGuessCount}</p>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-4">
            <Button
              color="primary"
              size="lg"
              onPress={onExit}
            >
              Exit Game
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
