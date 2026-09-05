import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";
import PageFrame from "@/components/ui/PageFrame";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
      <PageFrame />
      <img
        src="/assets/dollar-bill.svg"
        alt=""
        className="w-[150px] h-auto object-contain opacity-60 mb-5"
      />
      <div className="text-[64px] font-bold text-brand/80 leading-none mb-4">
        404
      </div>
      <div className="font-display text-primary text-[28px] tracking-[0.03em]">
        This page went missing
      </div>
      <div className="text-muted mt-2 max-w-[320px] text-[14px]">
        The page you're looking for doesn't exist. Head back to your portfolio.
      </div>
      <Link to="/" className="mt-6">
        <Button size="lg" showArrow>
          Go to Portfolio
        </Button>
      </Link>
    </div>
  );
}
