import { useNavigate } from "react-router-dom";
import merc from "./assets/merc.jpg";

function Hero() {
  const navigate = useNavigate();
  return (
    <div 
      className="container mt-3 mb-3 d-flex align-items-center justify-content-center text-center text-white" 
      style={{
        height: "50vh",
        backgroundImage: "url('src/assets/merc.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: "20px"
      }}
    >
      <div>
        <h1 className="display-3 fw-bold">Carental - Cùng bạn trên mọi hành trình</h1>
        <a href="#about" className="btn btn-success btn-lg" onClick={(e) => { e.preventDefault(); navigate("/search"); }}>Thuê xe ngay</a>
      </div>
    </div>
    
  );
}
export default Hero;