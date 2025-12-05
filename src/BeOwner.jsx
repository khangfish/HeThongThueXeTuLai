import React, { useState } from "react";
import OwnerLoginModal from "./OwnerLoginModal";
import OwnerRegisterModal from "./OwnerRegisterModal";

function BeOwner() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row w-75 shadow-lg rounded-4 overflow-hidden">
        {/* Bên trái: đăng ký */}
        <div className="col-md-6 bg-white p-5 d-flex flex-column align-items-center justify-content-center">
          <h3 className="text-success mb-4 fw-bold">Bạn chưa là chủ xe?</h3>
          <p className="text-center mb-4 text-secondary">
            Hãy đăng ký trở thành chủ xe để bắt đầu cho thuê và quản lý xe của bạn ngay hôm nay!
          </p>
          <button
            className="btn btn-success px-4 py-2 rounded-pill"
            onClick={() => setShowRegister(true)}
          >
            Đăng ký chủ xe
          </button>
        </div>

        {/* Bên phải: đăng nhập */}
        <div className="col-md-6 bg-dark text-white p-5 d-flex flex-column align-items-center justify-content-center">
          <h3 className="mb-4 fw-bold">Bạn đã là chủ xe?</h3>
          <p className="text-center mb-4 text-light opacity-75">
            Hãy đăng nhập để tiếp tục quản lý xe và theo dõi hợp đồng thuê của bạn.
          </p>
          <button
            className="btn btn-outline-light px-4 py-2 rounded-pill"
            onClick={() => setShowLogin(true)}
          >
            Đăng nhập chủ xe
          </button>
        </div>
      </div>

      {/* Modal đăng nhập */}
      {showLogin && (
        <OwnerLoginModal
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {/* Modal đăng ký */}
      {showRegister && (
        <OwnerRegisterModal
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
}

export default BeOwner;
