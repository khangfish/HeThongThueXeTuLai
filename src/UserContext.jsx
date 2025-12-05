import { createContext, useContext, useEffect, useState } from "react";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // Khôi phục phiên từ localStorage khi reload
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Lưu user vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  const login = (data) => {
    setUser(data);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    // nhỏ delay để đảm bảo context clear xong mới reload
    setTimeout(() => {
      window.location.href = "/";
    }, 100);
  };

  return (
    <UserContext.Provider value={{ user, setUser, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
