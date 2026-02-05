"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseclient";

const items = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "YouTube", href: "/youtube" },
  { name: "Facebook", href: "/facebook" },
  { name: "Instagram", href: "/instagram" },
  { name: "Schedule", href: "/schedule" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full bg-gray-900 text-white h-screen p-4 flex flex-col">
      <h1 className="text-xl font-bold mb-6">Social Scheduler</h1>

      <nav className="flex-1 space-y-2">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`block px-3 py-2 rounded ${
              pathname.startsWith(i.href)
                ? "bg-gray-700"
                : "hover:bg-gray-800"
            }`}
          >
            {i.name}
          </Link>
        ))}
      </nav>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/login";
        }}
        className="mt-auto text-sm text-red-400 hover:text-red-300"
      >
        Logout
      </button>
    </aside>
  );
}




























