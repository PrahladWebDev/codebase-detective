import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-ink-950 text-paper-100 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">🕵️</p>
      <p className="font-display text-xl">Case not found</p>
      <p className="text-paper-500 text-sm max-w-sm">There's nothing at this address. Let's get you back to the investigation.</p>
      <Link to="/" className="btn-primary">Back to Codebase Detective</Link>
    </div>
  );
}
