"use client";

import { Bookmark } from "lucide-react";

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
    <button className={className} type="submit" disabled={pending} onClick={onClick} aria-busy={pending} aria-label={label} title={title}>
      <Bookmark size={18} fill={saved ? "#7a3f28" : "none"} stroke="#7a3f28" />
    </button>
  );
}
