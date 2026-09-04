import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <div className="text-[64px] font-bold text-brand/80 leading-none mb-4">
        404
      </div>
      <div className="font-bold text-primary text-2xl tracking-tight">
        This page went missing
      </div>
      <div className="text-muted mt-2 max-w-[320px] text-[14px]">
        The page you're looking for doesn't exist. Head back to your portfolio.
      </div>
      <Link to="/" className="mt-6">
        <Button size="lg">Go to Portfolio</Button>
      </Link>
    </div>
  );
}
