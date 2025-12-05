import { createContext, useContext, useState, useEffect } from "react";

const OwnerContext = createContext();

export function OwnerProvider({ children }) {
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khi load app, đọc dữ liệu từ localStorage nếu có
  useEffect(() => {
        const storedOwner = localStorage.getItem("owner");
        if (storedOwner) {
        setOwner(JSON.parse(storedOwner));
        }
    }, []);

    useEffect(() => {
    const handleStorageChange = (e) => {
        if (e.key === "owner") {
        const newData = e.newValue ? JSON.parse(e.newValue) : null;
        setOwner(newData);
        }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

  const login = (data) => {
    setOwner(data);
    localStorage.setItem("owner", JSON.stringify(data));
  };

  const logout = () => {
    setOwner(null);
    localStorage.removeItem("owner");
    window.location.href = "/"; // Quay về trang chủ
  };

  return (
    <OwnerContext.Provider value={{ owner, login, logout }}>
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner() {
  return useContext(OwnerContext);
}
