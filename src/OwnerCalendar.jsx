import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import Select from "react-select";
import './OwnerCalendar.css'; // Sẽ tạo ở bước 5

const API_BASE = "http://localhost:3000";

// Hàm định dạng sự kiện cho FullCalendar
function formatScheduleToEvents(schedule) {
  return schedule.map(item => {
    const status = Number(item.TTX_MATTX);
    let title = item.TTX_TENTINHTRANG;
    let className = '';

    if (status === 2) { // Đang thuê
      title = `Đang thuê`;
      className = 'event-rented';
    } else if (status === 3) { // Bảo dưỡng
      title = `Bảo dưỡng`;
      className = 'event-maintenance';
    } else { // Sẵn sàng
      return null; // Không cần hiển thị "Sẵn sàng"
    }
    
    // Xử lý ngày kết thúc (FullCalendar cần ngày *sau* ngày kết thúc)
    let endDate = item.BGTT_NGAYGIOKETTHUC ? new Date(item.BGTT_NGAYGIOKETTHUC) : null;
    if (endDate) {
      endDate.setDate(endDate.getDate() + 1); // Thêm 1 ngày
    }

    return {
      id: `${item.BGTT_NGAYGIOBATDAU}-${item.TTX_MATTX}`,
      title: title,
      start: new Date(item.BGTT_NGAYGIOBATDAU),
      // Nếu là null (đang diễn ra), FullCalendar tự hiểu là vô hạn
      end: endDate, 
      className: className,
      allDay: true,
    };
  }).filter(Boolean); // Lọc bỏ các sự kiện null (ví dụ: "Sẵn sàng")
}

export default function OwnerCalendar() {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const ownerId = owner?.CX_MACX;
  
  const [loading, setLoading] = useState(false);
  const [carsList, setCarsList] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [events, setEvents] = useState([]);

  // 1. Lấy thông tin owner
  useEffect(() => {
    const stored = localStorage.getItem("owner");
    if (stored) {
      setOwner(JSON.parse(stored));
    } else {
      navigate("/login-owner");
    }
  }, [navigate]);

  // 2. Tải danh sách xe (chỉ 1 lần)
  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    fetch(`${API_BASE}/owner/${ownerId}/cars-list`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        // Chuyển đổi thành dạng { value, label } cho react-select
        const options = data.map(car => ({
          value: car.XE_MAXE,
          label: `${car.XE_BIENSOXE} (${car.HX_TENHANGXE} ${car.MODEL_TENMODEL})`
        }));
        setCarsList(options);
        // Tự động chọn xe đầu tiên
        if (options.length > 0) {
          setSelectedCar(options[0]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [ownerId]);

  // 3. Tải lịch của xe BẤT CỨ KHI NÀO selectedCar thay đổi
  useEffect(() => {
    if (!selectedCar) {
      setEvents([]); // Xóa lịch cũ nếu không chọn xe
      return;
    }
    
    setLoading(true);
    fetch(`${API_BASE}/owner/car-schedule/${selectedCar.value}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(scheduleData => {
        setEvents(formatScheduleToEvents(scheduleData));
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));

  }, [selectedCar]);

  return (
    <div className="container mt-4 mb-5 owner-calendar-page">
      <h2 className="text-success mb-3">Lịch Xe</h2>

      <div className="row mb-3 align-items-center">
        <div className="col-md-6">
          <label className="form-label fw-bold">Chọn xe để xem lịch:</label>
          <Select
            options={carsList}
            value={selectedCar}
            onChange={setSelectedCar}
            placeholder={loading ? "Đang tải danh sách xe..." : "Chọn xe..."}
            isLoading={loading && carsList.length === 0}
            isClearable={false}
          />
        </div>
      </div>
      
      {loading && (
        <div className="text-center p-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {!loading && (
        <div className="calendar-container p-3 bg-white rounded shadow-sm border">
          <FullCalendar
            key={selectedCar ? selectedCar.value : 'empty'} // Ép re-render khi đổi xe
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek'
            }}
            events={events}
            locale="vi"
            buttonText={{
              today: 'Hôm nay',
              month: 'Tháng',
              week: 'Tuần',
            }}
            height="70vh"
          />
        </div>
      )}
    </div>
  );
}