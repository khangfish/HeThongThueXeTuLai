<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Unlicense License][license-shield]][license-url]

<br />
<div align="center">
  <h3 align="center">Hệ Thống Thuê Xe Tự Lái</h3>

</div>

<details>
  <summary>Mục Lục</summary>
  <ol>
    <li>
      <a href="#about-the-project">Giới Thiệu Dự Án</a>
      <ul>
        <li><a href="#built-with">Công Nghệ Sử Dụng</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Cài Đặt & Chạy</a>
      <ul>
        <li><a href="#prerequisites">Yêu Cầu</a></li>
        <li><a href="#installation">Các Bước Cài Đặt</a></li>
      </ul>
    </li>
    <li><a href="#usage">Hướng Dẫn Sử Dụng</a></li>
    <li><a href="#roadmap">Lộ Trình Phát Triển</a></li>
    <li><a href="#contributing">Đóng Góp</a></li>
    <li><a href="#contact">Liên Hệ</a></li>
  </ol>
</details>

## Giới Thiệu Dự Án

**Hệ Thống Thuê Xe Tự Lái** là một giải pháp phần mềm giúp kết nối giữa đơn vị cho thuê xe và khách hàng có nhu cầu đi lại. Dự án giải quyết các vấn đề về quản lý lịch đặt xe thủ công, giúp người dùng dễ dàng xem thông tin xe và đặt cọc trực tuyến.

Các tính năng chính:
* Tìm kiếm xe theo loại, mức giá, hãng xe.
* Đặt lịch thuê xe và quản lý thời gian thuê.
* Quản lý danh sách xe và đơn hàng (Dành cho Admin).
* Giao diện thân thiện, tương thích nhiều thiết bị.


### Công Nghệ Sử Dụng

Dự án được xây dựng dựa trên các công nghệ phổ biến hiện nay:

* [![React][React.js]][React-url]
* [![Node][Node.js]][Node-url]
* [![Express][Express.js]][Express-url]
* [![MySQL][MySQL]][MySQL-url]
* [![Bootstrap][Bootstrap.com]][Bootstrap-url]


## Cài Đặt & Chạy

Dưới đây là hướng dẫn để ông (hoặc người khác) tải source code về và chạy được trên máy cá nhân.

### Yêu Cầu

Trước khi cài đặt, máy tính cần có sẵn:
* **Node.js**: [Tải tại đây](https://nodejs.org/en/)
* **MySQL Server** (XAMPP hoặc MySQL Workbench).

### Các Bước Cài Đặt

1.  **Clone repo về máy**
    ```sh
    git clone [https://github.com/khangfish/HeThongThueXeTuLai.git](https://github.com/khangfish/HeThongThueXeTuLai.git)
    ```
2.  **Cài đặt các gói thư viện (Dependencies)**
    Mở terminal tại thư mục dự án và chạy:
    ```sh
    npm install
    # Nếu dự án tách riêng client/server, hãy cd vào từng thư mục để npm install
    ```
3.  **Cấu hình Cơ sở dữ liệu (Database)**
    * Tạo một database trống trong MySQL tên là: `httxtl` (hoặc có thể cấu hình lại bằng cách chỉnh lại trong file db.js).
    * Import file `httxtl-sql.sql` vào database vừa tạo để có dữ liệu mẫu(còn nếu muốn tự tạo dữ liệu thì sài file httxtl.sql).
    
4.  **Cấu hình môi trường**
    * Dự án có file `db.js` chứa cấu hình kết nối. 
    * *Lưu ý:* Nếu máy có mật khẩu MySQL khác, hãy mở file `.env` và sửa lại dòng `DB_PASSWORD`.

5.  **Chạy dự án**
    ```sh
    # Lệnh chạy backend (ví dụ)
    npm run start-server
    
    # Lệnh chạy frontend (ví dụ)
    npm start
    ```

<p align="right">(<a href="#readme-top">quay về đầu trang</a>)</p>

## Hướng Dẫn Sử Dụng

Phần này mô tả sơ lược cách dùng:
1.  Đăng nhập vào hệ thống (Tài khoản admin: `admin`/`123456` - ví dụ).
2.  Chọn xe và ngày muốn thuê.
3.  Tiến hành thanh toán/đặt cọc.

*(Ông có thể thêm ảnh chụp màn hình giao diện ở đây sau)*

<p align="right">(<a href="#readme-top">quay về đầu trang</a>)</p>

## Lộ Trình Phát Triển

- [x] Thiết kế Database
- [x] API Đăng nhập/Đăng ký
- [x] Giao diện trang chủ & Danh sách xe
- [ ] Tích hợp thanh toán online (VNPAY/Momo)
- [ ] Chức năng đánh giá xe sau chuyến đi
- [ ] App Mobile (React Native)

Xem [danh sách các issue](https://github.com/khangfish/HeThongThueXeTuLai/issues) để biết chi tiết.

<p align="right">(<a href="#readme-top">quay về đầu trang</a>)</p>

## Đóng Góp

Mọi đóng góp đều được hoan nghênh.

1.  Fork dự án
2.  Tạo Feature Branch (`git checkout -b feature/TinhNangMoi`)
3.  Commit (`git commit -m 'Thêm tính năng X'`)
4.  Push (`git push origin feature/TinhNangMoi`)
5.  Mở Pull Request

<p align="right">(<a href="#readme-top">quay về đầu trang</a>)</p>

## Liên Hệ

Tác giả: **KhangFish**

Link Dự Án: [https://github.com/khangfish/HeThongThueXeTuLai](https://github.com/khangfish/HeThongThueXeTuLai)

<p align="right">(<a href="#readme-top">quay về đầu trang</a>)</p>

[contributors-shield]: https://img.shields.io/github/contributors/khangfish/HeThongThueXeTuLai.svg?style=for-the-badge
[contributors-url]: https://github.com/khangfish/HeThongThueXeTuLai/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/khangfish/HeThongThueXeTuLai.svg?style=for-the-badge
[forks-url]: https://github.com/khangfish/HeThongThueXeTuLai/network/members
[stars-shield]: https://img.shields.io/github/stars/khangfish/HeThongThueXeTuLai.svg?style=for-the-badge
[stars-url]: https://github.com/khangfish/HeThongThueXeTuLai/stargazers
[issues-shield]: https://img.shields.io/github/issues/khangfish/HeThongThueXeTuLai.svg?style=for-the-badge
[issues-url]: https://github.com/khangfish/HeThongThueXeTuLai/issues
[license-shield]: https://img.shields.io/github/license/khangfish/HeThongThueXeTuLai.svg?style=for-the-badge
[license-url]: https://github.com/khangfish/HeThongThueXeTuLai/blob/master/LICENSE.txt
[product-screenshot]: images/screenshot.png
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[Node.js]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Express.js]: https://img.shields.io/badge/Express.js-404D59?style=for-the-badge
[Express-url]: https://expressjs.com/
[MySQL]: https://img.shields.io/badge/MySQL-000000?style=for-the-badge&logo=mysql&logoColor=white
[MySQL-url]: https://www.mysql.com/
[Bootstrap.com]: https://img.shields.io/badge/Bootstrap-563D7C?style=for-the-badge&logo=bootstrap&logoColor=white
[Bootstrap-url]: https://getbootstrap.com