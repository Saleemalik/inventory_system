// src/components/Header.jsx
import { logoutUser } from "../auth/authService";

export default function Header() {
  return (
    <header className="w-full h-14 bg-white border-b shadow flex items-center justify-between px-6">

      <h1 className="text-2xl font-semibold">Inventory System</h1>

      <button
        onClick={logoutUser}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Logout
      </button>

    </header>
  );
}
