import { useState, useEffect, useRef } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login", { replace: true });
  }

  // Close menu when clicking outside the navbar
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [menuOpen]);

  const desktopLink = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition ${isActive ? "text-green-600" : "text-gray-500 hover:text-black"}`;

  const mobileLink = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive ? "text-green-600 bg-green-50" : "text-gray-700 hover:bg-gray-50"
    }`;

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 bg-white border-b border-gray-200"
    >
      <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Brand */}
        <Link
          to="/dashboard"
          className="text-lg font-bold text-black tracking-tight hover:text-green-600 transition"
        >
          MealMind
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/dashboard" className={desktopLink}>Dashboard</NavLink>
          <NavLink to="/generate" className={desktopLink}>Generate</NavLink>
          <NavLink to="/history" className={desktopLink}>History</NavLink>
          <NavLink to="/preferences" className={desktopLink}>Preferences</NavLink>
        </div>

        {/* Desktop user + logout */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm font-medium text-red-500 hover:text-red-600 transition cursor-pointer"
          >
            Logout
          </button>
        </div>

        {/* Mobile: hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 cursor-pointer"
        >
          <span
            className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 origin-center ${
              menuOpen ? "rotate-45 translate-y-[7px] w-5" : "w-5"
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 ${
              menuOpen ? "opacity-0 w-5" : "w-4"
            }`}
          />
          <span
            className={`block h-0.5 bg-gray-700 rounded transition-all duration-200 origin-center ${
              menuOpen ? "-rotate-45 -translate-y-[7px] w-5" : "w-5"
            }`}
          />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-0.5">
          <NavLink to="/dashboard" className={mobileLink} onClick={() => setMenuOpen(false)}>
            Dashboard
          </NavLink>
          <NavLink to="/generate" className={mobileLink} onClick={() => setMenuOpen(false)}>
            Generate
          </NavLink>
          <NavLink to="/history" className={mobileLink} onClick={() => setMenuOpen(false)}>
            History
          </NavLink>
          <NavLink to="/preferences" className={mobileLink} onClick={() => setMenuOpen(false)}>
            Preferences
          </NavLink>

          {/* Divider + user/logout */}
          <div className="border-t border-gray-100 mt-2 pt-3 px-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-red-500 hover:text-red-600 transition cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
