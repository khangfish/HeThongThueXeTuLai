import './navbar.css'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useUser } from './UserContext'
import LoginModal from './LoginModal'
import RegisterModal from './RegisterModal'

function Navbar() {
  const { user, logout } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <header className="p-3 bg-dark text-white">
        <div className="container">
          <div className="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
            <Link to="/" className="d-flex align-items-center mb-2 me-5 mb-lg-0 text-white text-decoration-none fw-bold fs-4">
              CARENTAL
            </Link>

            <ul className="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
              <li><Link to="/" className="nav-link px-2 text-white">Trang chủ</Link></li>
              <li><Link to="/be-owner" className="nav-link px-2 text-white">Trở thành chủ xe</Link></li>
              <li><Link to="/search" className="nav-link px-2 text-white">Tìm kiếm xe</Link></li>
            </ul>

            <div className="text-end">
              {user ? (
                <>
                  <span
                    className="me-3 user-name"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => window.location.href = `/profile`}
                  >
                    Xin chào, <strong>{user.KH_TENND}</strong>
                  </span>
                  <button type="button" className="btn btn-outline-light me-2" onClick={logout}>Đăng xuất</button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-outline-light me-2" onClick={() => setShowLogin(true)}>Đăng nhập</button>
                  <button type="button" className="btn btn-success text-light" onClick={() => setShowRegister(true)}>Đăng ký</button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSwitchToRegister={() => { setShowLogin(false); setShowRegister(true); }} />}

      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onSwitchToLogin={() => { setShowRegister(false); setShowLogin(true); }} />}
    </>
  )
}
export default Navbar
