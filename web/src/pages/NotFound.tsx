import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="font-serif font-bold text-white text-2xl">
        Page not found
      </div>
      <div className="font-serif text-[#98989d] mt-2">
        The page you're looking for doesn't exist.
      </div>
      <Link
        to="/"
        className="mt-6 border border-white px-4 py-2 font-serif text-white hover:bg-[#1a1a1a]"
      >
        Go home
      </Link>
    </div>
  );
}
