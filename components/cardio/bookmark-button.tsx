"use client";

import { Bookmark, LoaderCircle } from "lucide-react";

export function BookmarkButton({
  saved,
  pending,
  className,
  label,
  title,
  onClick,
}: {
  saved: boolean;
  pending: boolean;
  className: string;
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button className={className} disabled={pending} onClick={onClick} aria-label={label} title={title}>
      {pending ? <LoaderCircle size={18} className="spin" /> : <Bookmark size={18} fill={saved ? "currentColor" : "none"} />}
    </button>
  );
}
