import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="font-serif font-bold text-text text-2xl">
        Page not found
      </div>
      <div className="font-serif text-muted mt-2">
        The page you're looking for doesn't exist.
      </div>
      <Link
        to="/"
        className="mt-6 bg-brand text-white rounded-xl px-4 py-2 font-serif font-medium hover:bg-brand-hover"
      >
        Go home
      </Link>
    </div>
  );
}
