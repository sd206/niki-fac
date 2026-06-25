"use client";

import { logout } from "@/lib/firebase";
import { useCurrentFamily, useNotifications, useMarkAllNotificationsRead } from "@/lib/queries";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "/home", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/finance", label: "Finance" },
  { href: "/meals", label: "Meals" },
  { href: "/travel", label: "Travel" },
  { href: "/documents", label: "Vault" },
  { href: "/memories", label: "Memory" },
  { href: "/analytics", label: "Analytics" },
  { href: "/family", label: "Family" },
];

function NotificationBell() {
  const { family } = useCurrentFamily();
  const { data: notifications = [] } = useNotifications(family?.familyId, true);
  const markAll = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unread = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          setOpen(!open);
          if (unread > 0 && !open) {
            markAll.mutate(family!.familyId);
          }
        }}
        className="relative text-gray-600 hover:text-gray-900"
      >
        <span className="text-xl">{"\u{1F514}"}</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-card border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            Notifications
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No new notifications</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-gray-50 px-4 py-2 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500">{n.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <Link href="/home" className="text-lg font-bold text-primary">
          Niki
        </Link>
        <nav className="flex gap-4">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href
                  ? "font-semibold text-primary"
                  : "text-gray-600 hover:text-gray-900"
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <NotificationBell />
        <button onClick={() => logout()} className="text-sm text-gray-500 hover:text-danger">
          Sign out
        </button>
      </div>
    </header>
  );
}
