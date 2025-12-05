import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaUsers, FaGasPump, FaCogs,
  FaMapMarkerAlt, FaMap, FaLifeRing,
  FaVideo, FaCamera, FaCarCrash,
  FaUsb, FaLock, FaBluetooth,
  FaTachometerAlt,
} from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./rentalForm.css";
import { useUser } from "./UserContext";
import LoginModal from "./LoginModal";
import RegisterModal from "./RegisterModal";
import CarItem from "./carItem";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import L from "leaflet";
import ReactDOMServer from "react-dom/server";
import {vi} from 'date-fns/locale';

function AutoOpenPopup({ position, children }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !position) return;
    const html = ReactDOMServer.renderToString(children);
    const marker = L.marker(position).addTo(map);
    marker.bindPopup(html, {
      closeOnClick: false,
      autoClose: false,
    }).openPopup();
    return () => {
      map.removeLayer(marker);
    };
  }, [map, position, children]);

  return null;
}

export default function CarDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();

  const [car, setCar] = useState(null);
  const [images, setImages] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [terms, setTerms] = useState([]);
  const [suggestedCars, setSuggestedCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [error, setError] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [bookings, setBookings] = useState([]); // thêm

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    // Lấy ngày mai
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    // Đặt giờ về 00:00 (nửa đêm)
    tomorrow.setHours(0, 0, 0, 0);

    // Chuẩn hóa múi giờ và định dạng cho input datetime-local
    return new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const calcDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // chuẩn hóa về 00:00 để bỏ phần giờ
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff >= 0 ? diff + 1 : 0; // cộng thêm 1 ngày để tính trọn gói
  };

  const days = calcDays();
  const total = days * (car?.GiaThueNgay || 0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000/cars/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setCar(data);
        if (Array.isArray(data.DieuKhoan)) setTerms(data.DieuKhoan);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();

    fetch(`http://localhost:3000/car-images/${id}`)
      .then((r) => r.json())
      .then((imgs) => setImages(imgs))
      .catch(() => setImages([]));

    // fetch bookings
    fetch(`http://localhost:3000/car-bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        // normalize to Date objects for client-side checks
        const list = (data || []).map((d) => ({
          start: d.startAt ? new Date(d.startAt) : null,
          end: d.endAt ? new Date(d.endAt) : null,
        }));
        setBookings(list);
      })
      .catch(() => setBookings([]));
  }, [id]);

  useEffect(() => {
    if (car && user) {
      fetch("http://localhost:3000/views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ KH_SOCCCD: user.KH_SOCCCD, KH_SOGPLX: user.KH_SOGPLX, XE_MAXE: car.MaXe }),
      }).catch(() => {});
    }
  }, [car, user]);

  useEffect(() => {
    if (!car) return;
    let cancelled = false;

    const loadRecommend = async () => {
      try {
        // Chỉ cần gọi API /recommend (đã sửa)
        const res = await fetch(`http://localhost:3000/recommend/${car.MaXe}`, { cache: 'no-store' });
        if (res.ok) {
          const list = await res.json();
          if (!cancelled) {
            setSuggestedCars(list || []);
          }
        }
      } catch (e) {
        console.error("Lỗi tải gợi ý:", e);
        if (!cancelled) setSuggestedCars([]);
      }
    };

    loadRecommend();
    return () => {
      cancelled = true;
    };
  }, [car]);

  // helper: test overlap between selected [start,end) and existing bookings
  const overlapsBooking = (s, endDateObj) => {
    if (!s || !endDateObj) return false;
    for (const b of bookings) {
      if (!b.start || !b.end) continue;
      // overlap if not (booking_end <= s OR booking_start >= endDateObj)
      if (!(b.end <= s || b.start >= endDateObj)) return true;
    }
    return false;
  };

  const handleSubmit = (ev) => {
    ev && ev.preventDefault();
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    if (!startDate || !endDate) {
      setError("Vui lòng chọn ngày nhận và trả xe.");
      return;
    }
    if (days <= 0) {
      setError("Ngày trả phải lớn hơn ngày nhận.");
      return;
    }
    // validate overlap with bookings
    const s = new Date(startDate);
    const end = new Date(endDate);
    if (overlapsBooking(s, end)) {
      setError("Khoảng thời gian bạn chọn có xung đột với hợp đồng khác. Vui lòng chọn thời gian khác.");
      return;
    }

    setError("");
    // Chuyển ngày về dạng local 00:00 - 23:59 thay vì ISO UTC
    const normalizeLocalDate = (date, endOfDay = false) => {
      const d = new Date(date);
      if (endOfDay) {
        d.setHours(23, 59, 59, 999);
      } else {
        d.setHours(0, 0, 0, 0);
      }
      // Định dạng lại thành chuỗi "YYYY-MM-DD HH:mm:ss" đúng với MySQL datetime
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    const normalizedStart = normalizeLocalDate(startDate, false);
    const normalizedEnd = normalizeLocalDate(endDate, true);

    const contractPayload = {
      user,
      car,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      days,
      total,
      terms: terms || [],
    };

    navigate("/contract", { state: contractPayload });
  };

  const lat = Number(car?.Latitude || 0);
  const lng = Number(car?.Longitude || 0);
  const hasCoords = !!(lat && lng);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-success" role="status" />
        <p className="mt-2 text-muted">Đang tải thông tin xe...</p>
      </div>
    );
  }

  if (!car) return <p className="text-center text-muted py-5">Không tìm thấy xe.</p>;

  const openModal = (index) => {
    setCurrentIndex(index);
    setShowModal(true);
  };

  return (
    <div className="container py-5 car-detail-page">
      <div className="row g-3 align-items-stretch">
        <div className="col-lg-8">
          <div className="border rounded shadow-sm overflow-hidden position-relative" style={{ aspectRatio: "16/9", backgroundColor: "#f8f9fa" }}>
            <img
              src={`http://localhost:3000${images[0] || car.HinhAnh || ""}`}
              alt="Ảnh xe"
              className="w-100 h-100"
              style={{ objectFit: "cover", cursor: "pointer" }}
              onClick={() => openModal(0)}
            />
            {images.length > 0 && (
              <button
                type="button"
                className="btn btn-light btn-sm position-absolute bottom-0 end-0 m-3 shadow-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openModal(0);
                }}
              >
                Xem tất cả ảnh
              </button>
            )}
          </div>
        </div>

        <div className="col-lg-4 d-flex flex-column gap-2">
          <div className="d-flex flex-column justify-content-between p-2 bg-white rounded shadow-sm" style={{ height: "100%", aspectRatio: "16/9" }}>
            {images.slice(1, 4).map((img, idx) => (
              <div key={idx} className="overflow-hidden rounded border flex-grow-1" style={{ cursor: "pointer" }} onClick={() => openModal(idx + 1)}>
                <img src={`http://localhost:3000${img}`} alt={`thumb-${idx}`} className="w-100 h-100" style={{ objectFit: "cover" }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row mt-5">
        <div className="col-md-8">
          <div className="info-box p-4 bg-white rounded shadow-sm">
            <h2 className="fw-bold mb-2 text-dark">{car.HangXe} {car.TenModel}</h2>
            <div className="d-flex align-items-center text-muted mb-3">
              <FaMapMarkerAlt className="me-2 text-success" />
              <div className="fw-medium">{car.DiaChi}</div>
            </div>

            <div className="d-flex flex-wrap mb-4 text-secondary">
              <div className="me-4 mb-2"><FaCogs className="text-success me-1" />{car.HopSo}</div>
              <div className="me-4 mb-2"><FaUsers className="text-success me-1" />{car.SoCho} chỗ</div>
              <div className="me-4 mb-2"><FaGasPump className="text-success me-1" />{car.NhienLieu}</div>
              <div className="me-4 mb-2"><FaTachometerAlt className="text-success me-1" />{car.TieuHao}</div>
            </div>

            <h5 className="fw-semibold text-dark mb-3">Tiện nghi</h5>
            <div className="row mb-4 text-secondary">
              {Boolean(car.CamHanhTrinh) && <div className="col-md-4 mb-2"><FaVideo className="text-success me-2" />Camera hành trình</div>}
              {Boolean(car.CanhBaoTD) && <div className="col-md-4 mb-2"><FaTachometerAlt className="text-success me-2" />Cảnh báo tốc độ</div>}
              {Boolean(car.BanDo) && <div className="col-md-4 mb-2"><FaMap className="text-success me-2" />Bản đồ</div>}
              {Boolean(car.CamLui) && <div className="col-md-4 mb-2"><FaCamera className="text-success me-2" />Camera lùi</div>}
              {Boolean(car.DuPhong) && <div className="col-md-4 mb-2"><FaLifeRing className="text-success me-2" />Lốp dự phòng</div>}
              {Boolean(car.CamBien) && <div className="col-md-4 mb-2"><FaCarCrash className="text-success me-2" />Cảm biến va chạm</div>}
              {Boolean(car.GPS) && <div className="col-md-4 mb-2"><FaMapMarkerAlt className="text-success me-2" />Định vị GPS</div>}
              {Boolean(car.USB) && <div className="col-md-4 mb-2"><FaUsb className="text-success me-2" />USB</div>}
              {Boolean(car.TuiKhi) && <div className="col-md-4 mb-2"><FaLock className="text-success me-2" />Túi khí</div>}
              {Boolean(car.Bluetooth) && <div className="col-md-4 mb-2"><FaBluetooth className="text-success me-2" />Bluetooth</div>}
            </div>

            {terms.length > 0 && (
              <div className="terms-box p-3 bg-light rounded">
                <h5 className="fw-bold mb-3 text-success">Điều khoản sử dụng</h5>
                <ol className="ps-3 mb-0">
                  {terms.map((t, i) => <li key={i} className="mb-2 text-secondary">{t.NoiDung}</li>)}
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="col-md-4">
          <div className="rental-form-card bg-white rounded shadow-lg p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <h4 className="fw-bold text-success mb-3">Đặt xe ngay</h4>
              <div className="price-box mb-4">
                <h2 className="fw-bold text-dark mb-0">{Number(car.GiaThueNgay).toLocaleString("vi-VN")}đ <span className="text-secondary fw-normal fs-4">/ ngày</span></h2>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-3 position-relative">
                  <label className="form-label fw-semibold">Chọn ngày thuê</label>

                  {/* Ô giả để hiển thị khoảng ngày đã chọn */}
                  <div
                    className="form-control"
                    style={{ cursor: "pointer", backgroundColor: "#fff" }}
                    onClick={() => setShowCalendar(!showCalendar)}
                  >
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString("vi-VN")} → ${new Date(endDate).toLocaleDateString("vi-VN")}`
                      : "Chọn ngày thuê"}
                  </div>

                  {/* Lịch chỉ hiện khi showCalendar = true */}
                  {showCalendar && (
                    <div className="position-absolute bg-white border rounded shadow p-2 mt-2" style={{ zIndex: 1050 }}>
                      <DateRange
                        locale={vi}
                        ranges={[
                          {
                            startDate: new Date(startDate),
                            endDate: new Date(endDate),
                            key: "selection",
                          },
                        ]}
                        onChange={(ranges) => {
                          const s = ranges.selection.startDate;
                          const e = ranges.selection.endDate;
                          setStartDate(s.toISOString());
                          setEndDate(e.toISOString());
                        }}
                        minDate={new Date(new Date().setDate(new Date().getDate() + 1))} // chỉ từ ngày mai
                        disabledDates={bookings.flatMap((b) => {
                          const dates = [];
                          let d = new Date(b.start);
                          while (d <= new Date(b.end)) {
                            dates.push(new Date(d));
                            d.setDate(d.getDate() + 1);
                          }
                          return dates;
                        })}
                        moveRangeOnFirstSelection={false}
                        showDateDisplay={false}
                        months={1}
                        direction="horizontal"
                      />
                      <div className="text-end mt-2">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => setShowCalendar(false)}
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <div className="highlight-summary bg-light border border-success-subtle rounded-3 p-3 mt-4 shadow-sm">
                  <div className="d-flex justify-content-between align-items-center mb-2"><span className="fw-semibold text-secondary">Số ngày thuê:</span><span className="fw-bold text-dark">{days || 0} ngày</span></div>
                  <div className="d-flex justify-content-between align-items-center mb-2"><span className="fw-semibold text-secondary">Tổng tiền:</span><span className="fw-bold fs-5 text-success">{total.toLocaleString("vi-VN")}đ</span></div>
                </div>

                <button type="submit" className="btn btn-success w-100 mt-4 py-2 fw-semibold">Xác nhận thuê xe</button>
              </form>

              <div className="mt-4 small text-muted">
                Chủ xe: <strong>{car.CX_HOTENCX || "—"}</strong>
                <div>Liên hệ: {car.CX_SODT || "—"} · {car.CX_EMAIL || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h5 className="fw-bold mb-3 text-success"><i className="bi bi-geo-alt me-2"></i> Bản đồ vị trí xe</h5>
        <div className="card shadow-sm">
          <div className="card-body p-0" style={{ minHeight: 320 }}>
            {hasCoords ? (
              <MapContainer center={[lat, lng]} zoom={16} style={{ height: 420, width: "100%" }} scrollWheelZoom={true}>
                <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <AutoOpenPopup position={[lat, lng]}>
                  <div style={{ minWidth: 200 }}>
                    <div className="fw-bold">Số {car.ChiNhanhDiaChi || "Chi nhánh"}, {car.DiaChi}</div>
                    {/* <div className="small text-muted">{car.DiaChi}</div> */}
                    <hr className="my-2" />
                    <div><strong>Chủ xe:</strong> {car.CX_HOTENCX || "—"}</div>
                    <div className="small">SĐT: {car.CX_SODT || "—"}</div>
                    <div className="small">Email: {car.CX_EMAIL || "—"}</div>
                  </div>
                </AutoOpenPopup>
              </MapContainer>
            ) : (
              <div className="p-3">Không có tọa độ để hiển thị bản đồ.</div>
            )}
          </div>
        </div>
      </div>

      {suggestedCars.length > 0 && (
        <div className="mt-5">
          <h5 className="fw-bold mb-3 text-success"><i className="bi bi-lightbulb me-2"></i> Xe bạn có thể quan tâm</h5>
          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-3">
            {suggestedCars.map((item, i) => (
              <div className="col" key={`${item.MaXe ?? "car"}-${i}`}>
                <CarItem car={item} />
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(0,0,0,0.9)", zIndex: 1050 }} onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh" }} className="position-relative d-flex align-items-center">
            {images.length > 1 && <button className="btn btn-light me-3" style={{ width: 45, height: 45, borderRadius: "50%" }} onClick={() => setCurrentIndex((p) => (p - 1 + images.length) % images.length)}>‹</button>}
            <img src={`http://localhost:3000${images[currentIndex] || car.HinhAnh || ""}`} alt="Ảnh" style={{ maxWidth: "80vw", maxHeight: "80vh", objectFit: "contain" }} className="rounded shadow" />
            {images.length > 1 && <button className="btn btn-light ms-3" style={{ width: 45, height: 45, borderRadius: "50%" }} onClick={() => setCurrentIndex((p) => (p + 1) % images.length)}>›</button>}
          </div>
        </div>
      )}

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onSwitchToRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }} />}
      {showRegisterModal && <RegisterModal onClose={() => setShowRegisterModal(false)} onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }} />}

      {/* hiển thị bookings hint */}
      {/* <div className="mt-3 small text-muted">
        {bookings.length > 0 ? (
          <>
            <div>Những khoảng đã được đặt (không thể chọn):</div>
            <ul className="small text-secondary">
              {bookings.map((b, i) => <li key={i}>{b.start ? new Date(b.start).toLocaleString() : "—"} → {b.end ? new Date(b.end).toLocaleString() : "—"}</li>)}
            </ul>
          </>
        ) : (
          <div>Xe hiện chưa có booking chồng thời gian.</div>
        )}
      </div> */}
    </div>
  );
}