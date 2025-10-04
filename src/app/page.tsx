import Game from '@/components/Game';

export default function Home() {
  return (
    <div className="dark">
      <Game />
    </div>
  );
}

export const metadata = {
  title: 'Contexto - Word Guessing Game',
  description:
    'Find the secret word using context and semantic similarity. A fun word puzzle game inspired by Contexto.',
  keywords:
    'contexto, word game, puzzle, semantic similarity, context, guessing game',
  authors: [{ name: 'Hiro' }],
};
