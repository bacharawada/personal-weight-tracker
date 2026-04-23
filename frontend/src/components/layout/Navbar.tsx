import { Moon, Sun } from "lucide-react";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  return (
    <nav className="bg-blue-600 dark:bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <h1 className="text-xl font-bold tracking-tight">Weight Tracker</h1>
      <button
        onClick={onToggleTheme}
        className="p-2 rounded-lg hover:bg-blue-700 dark:hover:bg-gray-800 transition-colors"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </nav>
  );
}
