'use client';

import { Card, CardBody, Button } from '@nextui-org/react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
          CONTEXTO
        </h1>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Find the secret word using context and semantic similarity
        </p>
      </div>

      {/* Game Mode Selection */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Single Player */}
        <Card
          isPressable
          onPress={() => router.push('/play')}
          className="bg-slate-800/50 border border-slate-700 hover:border-emerald-500 transition-all cursor-pointer"
        >
          <CardBody className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Single Player</h2>
                <p className="text-slate-400 text-sm mt-1">Play today&apos;s daily word</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Multiplayer */}
        <Card
          isPressable
          onPress={() => router.push('/multiplayer')}
          className="bg-slate-800/50 border border-slate-700 hover:border-blue-500 transition-all cursor-pointer"
        >
          <CardBody className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Multiplayer</h2>
                <p className="text-slate-400 text-sm mt-1">Challenge a friend 1v1</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* How to Play */}
      <div className="mt-12 text-center">
        <Button
          variant="light"
          className="text-slate-400 hover:text-white"
          onPress={() => {
            // Could open a modal with instructions
            alert('Guess the secret word! Each guess shows how close you are (1 = exact match). Lower numbers mean you are getting warmer!');
          }}
        >
          How to Play
        </Button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 text-slate-500 text-sm">
        Made with semantic similarity
      </div>
    </div>
  );
}
