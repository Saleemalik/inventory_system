import { useState, useEffect } from "react";
import { loginUser } from "../auth/authService";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Redirect if already logged in
  useEffect(() => {
    if (localStorage.getItem("access")) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    // setLoading(true);

    try {
      
     await loginUser({
        username: form.username, 
        password: form.password,
      });   
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      console.log(err);
      

      if (err.response?.data?.detail) {
        
        setError(err.response.data.detail);
      } else {
        setError("Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-2xl shadow-lg w-96"
      >
        <h2 className="text-2xl font-bold text-center mb-6">
          User Login
        </h2>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">
            {error}
          </p>
        )}

        <label className="block mb-2 text-sm font-medium">
          username
        </label>
        <input
          name="username"
          type="text"
          className="w-full border px-3 py-2 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.username}
          onChange={handleChange}
          required
        />

        <label className="block mb-2 text-sm font-medium">
          Password
        </label>
        <input
          name="password"
          type="password"
          className="w-full border px-3 py-2 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.password}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}