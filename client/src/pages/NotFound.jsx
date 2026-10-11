import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream-50 p-6 text-center">
      <div>
        <img src="/logo.svg" alt="" className="mx-auto h-16 w-16" />
        <h1 className="mt-4 font-brand text-4xl font-bold text-brand-700">404</h1>
        <p className="mt-1 text-slate-500">This page could not be found.</p>
        <Link to="/" className="btn-primary mt-5"><Home className="h-4 w-4" /> Back to Chotulal Sweets</Link>
      </div>
    </div>
  );
}
