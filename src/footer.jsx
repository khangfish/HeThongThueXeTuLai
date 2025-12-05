function Footer() {
  return (
    <footer className="bg-dark text-white pt-4 border-top" style={{ boxShadow: '0 -2px 6px rgba(0,0,0,0.08)' }}>
        <div className="container">
            <div className="row">
            {/* Logo + intro */}
            <div className="col-md-4 mb-3">
                <h4><b>Carental</b></h4>
                <p className="">
                Mang đến cho bạn dịch vụ thuê xe uy tín, nhanh chóng và tiện lợi. Với đa dạng các loại xe và chất lượng, chúng tôi cam kết đồng hành cùng bạn trên mọi hành trình.
                </p>
            </div>

            {/* Quick links */}
            <div className="col-md-4 mb-3 text-center">
            </div>

            {/* Contact / social */}
            <div className="col-md-4 mb-3 text-end">
                <h5><b>Liên hệ:</b></h5>
                <p>Email: khangb2110045@student.ctu.edu.vn</p>
                <p>Số điện thoại: 0999 999 999</p>
                <div>
                <a href="#" className="me-2 text-light"><i className="bi bi-facebook"></i></a>
                <a href="#" className="me-2 text-light"><i className="bi bi-twitter"></i></a>
                <a href="#" className="me-2 text-light"><i className="bi bi-instagram"></i></a>
                </div>
            </div>
            </div>

            {/* Bottom line */}
            <div className="text-center py-3 border-top mt-3">
            <small className="">© 2025 Carental. All rights reserved.</small>
            </div>
        </div>
    </footer>
  )
}
export default Footer;
