import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "./UserContext";
import { QRCodeCanvas } from "qrcode.react";

export default function ContractDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const state = location.state || null;

  const [payload, setPayload] = useState(state);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showViewPrompt, setShowViewPrompt] = useState(false);
  const [savedContract, setSavedContract] = useState(null);

  useEffect(() => {
    if (!payload && state) setPayload(state);
  }, [state]);

  if (!payload) {
    return (
      <div className="container py-5">
        <div className="alert alert-warning">Không có dữ liệu hợp đồng. Quay lại trang trước.</div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>Quay lại</button>
      </div>
    );
  }

  const { car, startDate, endDate, days, total, terms } = payload;
  const plate = car?.BienSo || car?.XE_BIENSOXE || "—";
  const genId = () => `HDT${Date.now().toString().slice(-7)}`;

  // remove XLSX generation; only create contract on server and show prompt
  const handleConfirm = async () => {
    if (!user) {
      setError("Bạn cần đăng nhập để chốt hợp đồng.");
      return;
    }
    setError("");
    setLoading(true);

    const DKSDDV_MADKSDDV = (terms && terms.length > 0 && terms[0].DKSDDV_MADKSDDV) || null;
    const CX_MACX = car?.CX_MACX || null;

    if (!DKSDDV_MADKSDDV || !CX_MACX) {
      setError("Thiếu mã điều khoản hoặc mã chủ xe. Liên hệ quản trị viên.");
      setLoading(false);
      navigate("/");
      return;
    }

    const HDT_MAHDT = genId();

    const body = {
      KH_SOCCCD: user.KH_SOCCCD,
      KH_SOGPLX: user.KH_SOGPLX,
      XE_MAXE: car.MaXe,
      DKSDDV_MADKSDDV,
      CX_MACX,
      HDT_MAHDT,
      HDT_NGAYGIOBDTHUE: startDate,
      HDT_NGAYGIOKTTHUE: endDate,
      HDT_CHITIETHD: `Thuê ${car.HangXe} ${car.TenModel} (${car.MaXe}) - ${days} ngày - Tổng ${total.toLocaleString("vi-VN")}đ`,
    };

    try {
      const res = await fetch("http://localhost:3000/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Lỗi khi tạo hợp đồng");
        return;
      }

      const generatedId = data.HDT_MAHDT || HDT_MAHDT;
      const contractPayload = {
        HDT_MAHDT: generatedId,
        car,
        user,
        startDate,
        endDate,
        days,
        total,
        terms,
        HDT_CHITIETHD: body.HDT_CHITIETHD,
        HDT_NGAYGIOLAPHOPDONG: new Date().toLocaleString(),
      };

      setSavedContract(contractPayload);
      setShowViewPrompt(true);
    } catch (e) {
      setError("Lỗi mạng khi chốt hợp đồng.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onPromptChoice = (choice) => {
    setShowViewPrompt(false);
    if (choice === "yes") {
      // navigate to ContractView and pass state so it can render and auto-save
      navigate("/contract-view", { state: savedContract });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <h4 className="card-title mb-3">Chi tiết hợp đồng</h4>

          <div className="row">
            <div className="col-md-8">
              <h5 className="mb-2">{car.HangXe} {car.TenModel} <small className="text-muted">({car.MaXe})</small></h5>
              <div className="mb-1">Biển số: <strong>{plate}</strong></div>
              <div className="mb-2">Giá thuê/ngày: <strong>{Number(car.GiaThueNgay).toLocaleString("vi-VN")}đ</strong></div>
              <div className="mb-2">Số ngày: <strong>{days}</strong></div>
              <div className="mb-2">Tổng tiền: <strong>{total.toLocaleString("vi-VN")}đ</strong></div>

              <div className="mt-3">
                <h6>Thông tin chủ xe</h6>
                <div>Tên chủ xe: <strong>{car.CX_HOTENCX || "—"}</strong></div>
                <div>Số điện thoại: {car.CX_SODT || "—"}</div>
                <div>Email: {car.CX_EMAIL || "—"}</div>
                <div>Số tài khoản: {car.CX_STK || "—"} ({car.CX_NGANHANG || "—"})</div>
              </div>

              <div className="mt-3">
                <h6>Địa điểm nhận</h6>
                <div>Số: {car.ChiNhanhDiaChi || "—"}, đường {car.DiaChi}</div>
              </div>

              {terms && terms.length > 0 && (
                <div className="mt-3">
                  <h6>Điều khoản áp dụng</h6>
                  <ol>
                    {terms.map((t, i) => <li key={i} className="small text-secondary">{t.NoiDung}</li>)}
                  </ol>
                </div>
              )}
            </div>

            <div className="col-md-4">
              <div className="border rounded p-3">
                <div><strong>Khách hàng</strong></div>
                <div>{user?.KH_TENND || "—"}</div>
                <div className="small text-muted">Số CCCD: {user?.KH_SOCCCD}</div>
                <div className="small text-muted">Số GPLX: {user?.KH_SOGPLX}</div>

                <div className="mt-3">
                  <strong>Thời gian</strong>
                  <div className="small">
                    {new Date(startDate).toLocaleDateString("vi-VN")} → {new Date(endDate).toLocaleDateString("vi-VN")}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-center">
                    <div
                      className="d-inline-block border p-2 rounded shadow-sm"
                      style={{ cursor: "pointer" }}
                      onClick={handleConfirm}
                      title="Nhấn để chốt hợp đồng và tải file Excel"
                    >
                      <QRCodeCanvas
                        value={`Thanh toán thuê xe\nNgân hàng: ${car.CX_NGANHANG}\nSTK: ${car.CX_STK}\nChủ tài khoản: ${car.CX_HOTENCX}\nSố tiền: ${total.toLocaleString("vi-VN")}đ\nNội dung: ${user?.KH_TENND || "Khách hàng"} thuê ${car.HangXe} ${car.TenModel}`}
                        size={180}
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                  <button className="btn btn-outline-secondary w-100 mt-2" onClick={() => navigate(-1)}>Trở về</button>
                </div>

                {error && <div className="alert alert-danger mt-3">{error}</div>}
                {loading && <div className="mt-2">Đang xử lý...</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal prompt --- simple custom modal */}
      {showViewPrompt && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 2000 }}>
          <div className="bg-white rounded p-4 shadow" style={{ width: 420 }}>
            <h5 className="mb-3">Thanh toán thành công</h5>
            <p>Bạn có muốn xem hợp đồng ngay bây giờ không?</p>
            <div className="d-flex justify-content-end gap-2">
              <button className="btn btn-secondary" onClick={() => onPromptChoice("no")}>Không</button>
              <button className="btn btn-success" onClick={() => onPromptChoice("yes")}>Có, xem hợp đồng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}