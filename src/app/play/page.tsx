import Game from '@/components/Game';

export default function PlayPage() {
  return (
    <div className="dark">
      <Game />
    </div>
  );
}

export const metadata = {
  title: 'Play - Contexto',
  description: 'Play the daily Contexto word puzzle',
};
