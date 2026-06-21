import {useEffect, useState} from "react";
import { getCurrentUser } from "../auth/authService";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (err) {
      console.log("Failed to fetch user:", err);
    }
  };
  return (
    <div>
      <h1 className="text-3xl font-bold">✅ Dashboard</h1>
      {user && (
        <div>
          <p>Welcome, {user.username}!</p>
        </div>
      )}
    </div>
  );
}
