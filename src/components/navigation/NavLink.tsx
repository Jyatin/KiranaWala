"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function NavLink({ href, children, className, onClick }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center text-sm font-medium text-[#0B051D] transition-colors duration-200 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-[#7B57D8]",
        isActive && "font-semibold text-[#0B051D]",
        className
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-[#FFA8CD] transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100",
          isActive && "scale-x-100"
        )}
      />
    </Link>
  );
}
