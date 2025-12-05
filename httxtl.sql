/*==============================================================*/
/* DBMS name:      MySQL 5.0                                    */
/* Created on:     15/11/2025 2:48:55 pm                        */
/*==============================================================*/


drop table if exists BANG_GIA;

drop table if exists BAN_GHI_TINH_TRANG;

drop table if exists CHI_NHANH_THUE_XE;

drop table if exists CHU_XE;

drop table if exists DIEU_KHOAN_SU_DUNG_DV;

drop table if exists DUONG;

drop table if exists HANG_XE;

drop table if exists HOP_DONG_THUE;

drop table if exists KHACH_HANG;

drop table if exists MODEL;

drop table if exists PHUONG;

drop table if exists QUAN_TAM;

drop table if exists THANH_PHO;

drop table if exists TIEN_ICH_XE;

drop table if exists TINH_TRANG_XE;

drop table if exists XE;

/*==============================================================*/
/* Table: BANG_GIA                                              */
/*==============================================================*/
create table BANG_GIA
(
   XE_MAXE              char(5) not null,
   CX_MACX              int not null,
   BG_NGAYGIOAPDUNG     datetime not null,
   BG_GIATHUETHEONGAY   int not null,
   BG_NGAYGIONGUNGAPDUNG datetime,
   primary key (XE_MAXE, CX_MACX, BG_NGAYGIOAPDUNG)
);

/*==============================================================*/
/* Table: BAN_GHI_TINH_TRANG                                    */
/*==============================================================*/
create table BAN_GHI_TINH_TRANG
(
   XE_MAXE              char(5) not null,
   TTX_MATTX            int not null,
   CNTX_MACNTX          int not null,
   BGTT_NGAYGIOBATDAU   datetime not null,
   BGTT_NGAYGIOKETTHUC  datetime,
   primary key (XE_MAXE, TTX_MATTX, CNTX_MACNTX, BGTT_NGAYGIOBATDAU)
);

/*==============================================================*/
/* Table: CHI_NHANH_THUE_XE                                     */
/*==============================================================*/
create table CHI_NHANH_THUE_XE
(
   CNTX_MACNTX          int not null,
   CX_MACX              int not null,
   DUONG_MADUONG        char(4) not null,
   CNTX_SODIACHI        varchar(255) not null,
   CNTX_LONGTITUDE      char(10) not null,
   CNTX_LATITUDE        char(10) not null,
   primary key (CNTX_MACNTX)
);

/*==============================================================*/
/* Table: CHU_XE                                                */
/*==============================================================*/
create table CHU_XE
(
   CX_MACX              int not null,
   CX_HOTENCX           varchar(255) not null,
   CX_SODT              varchar(11) not null,
   CX_EMAIL             varchar(255) not null,
   CX_STK               varchar(50) not null,
   CX_NGANHANG          varchar(255) not null,
   CX_TENTAIKHOAN       varchar(255) not null,
   CX_MATKHAU           varchar(255) not null,
   primary key (CX_MACX)
);

/*==============================================================*/
/* Table: DIEU_KHOAN_SU_DUNG_DV                                 */
/*==============================================================*/
create table DIEU_KHOAN_SU_DUNG_DV
(
   DKSDDV_MADKSDDV      int not null,
   CX_MACX              int,
   DKSDDV_NOIDUNG       varchar(1024) not null,
   DKSDDV_NGAYGIOAPDUNG datetime not null,
   DKSDDV_NGAYGIONGUNGAPDUNG datetime,
   primary key (DKSDDV_MADKSDDV)
);

/*==============================================================*/
/* Table: DUONG                                                 */
/*==============================================================*/
create table DUONG
(
   DUONG_MADUONG        char(4) not null,
   PHUONG_MAPHUONG      char(4) not null,
   DUONG_TENDUONG       varchar(255) not null,
   primary key (DUONG_MADUONG)
);

/*==============================================================*/
/* Table: HANG_XE                                               */
/*==============================================================*/
create table HANG_XE
(
   HX_MAHANGXE          char(4) not null,
   HX_TENHANGXE         varchar(255) not null,
   HX_LINKHINH          varchar(999),
   primary key (HX_MAHANGXE)
);

/*==============================================================*/
/* Table: HOP_DONG_THUE                                         */
/*==============================================================*/
create table HOP_DONG_THUE
(
   KH_SOCCCD            char(12) not null,
   KH_SOGPLX            char(12) not null,
   XE_MAXE              char(5) not null,
   DKSDDV_MADKSDDV      int not null,
   CX_MACX              int not null,
   HDT_MAHDT            char(10) not null,
   HDT_NGAYGIOBDTHUE    datetime not null,
   HDT_NGAYGIOKTTHUE    datetime not null,
   HDT_CHITIETHD        varchar(1024) not null,
   HDT_NGAYGIOLAPHOPDONG datetime not null,
   primary key (KH_SOCCCD, KH_SOGPLX, XE_MAXE, DKSDDV_MADKSDDV, CX_MACX, HDT_MAHDT)
);

/*==============================================================*/
/* Table: KHACH_HANG                                            */
/*==============================================================*/
create table KHACH_HANG
(
   KH_SOCCCD            char(12) not null,
   KH_SOGPLX            char(12) not null,
   KH_TENND             varchar(255) not null,
   KH_GIOITINH          varchar(4) not null,
   KH_NGAYSINH          datetime not null,
   KH_TENTAIKHOAN       varchar(255) not null,
   KH_MATKHAU           varchar(255) not null,
   KH_SODIENTHOAI       varchar(11),
   KH_EMAIL             varchar(50),
   KH_SOTK              varchar(50) not null,
   KH_TENNGANHANG       varchar(255) not null,
   primary key (KH_SOCCCD, KH_SOGPLX)
);

/*==============================================================*/
/* Table: MODEL                                                 */
/*==============================================================*/
create table MODEL
(
   MODEL_MAMODEL        int not null,
   HX_MAHANGXE          char(4) not null,
   MODEL_TENMODEL       varchar(255) not null,
   MODEL_TRUYENDONG     varchar(255) not null,
   MODEL_SOGHE          int not null,
   MODEL_NHIENLIEU      varchar(255) not null,
   MODEL_TIEUHAO        varchar(255) not null,
   primary key (MODEL_MAMODEL)
);

/*==============================================================*/
/* Table: PHUONG                                                */
/*==============================================================*/
create table PHUONG
(
   PHUONG_MAPHUONG      char(4) not null,
   TP_MATP              char(4) not null,
   PHUONG_TENPHUONG     varchar(255) not null,
   primary key (PHUONG_MAPHUONG)
);

/*==============================================================*/
/* Table: QUAN_TAM                                              */
/*==============================================================*/
create table QUAN_TAM
(
   KH_SOCCCD            char(12) not null,
   KH_SOGPLX            char(12) not null,
   XE_MAXE              char(5) not null,
   QT_THOIDIEMXEM       datetime,
   primary key (KH_SOCCCD, KH_SOGPLX, XE_MAXE)
);

/*==============================================================*/
/* Table: THANH_PHO                                             */
/*==============================================================*/
create table THANH_PHO
(
   TP_MATP              char(4) not null,
   TP_TENTP             varchar(255) not null,
   primary key (TP_MATP)
);

/*==============================================================*/
/* Table: TIEN_ICH_XE                                           */
/*==============================================================*/
create table TIEN_ICH_XE
(
   XE_MAXE              char(5) not null,
   TIX_NGAYGIOCAPNHAT   datetime not null,
   TIX_NGAYGIODANGKIEM  datetime not null,
   TIX_BANDO            bool,
   TIX_BLUETOOTH        bool,
   TIX_CAMERAHANHTRINH  bool,
   TIX_CAMERALUI        bool,
   TIX_CAMBIENVACHAM    bool,
   TIX_CANHBAOTOCDO     bool,
   TIX_DINHVIGPS        bool,
   TIX_KHECAMUSB        bool,
   TIX_LOPDUPHONG       bool,
   TIX_MANHINHDVD       bool,
   TIX_ETC              bool,
   TIX_TUIKHIANTOAN     bool,
   TIX_LINKHINH         varchar(999),
   primary key (XE_MAXE)
);

/*==============================================================*/
/* Table: TINH_TRANG_XE                                         */
/*==============================================================*/
create table TINH_TRANG_XE
(
   TTX_MATTX            int not null,
   TTX_TENTINHTRANG     varchar(255) not null,
   primary key (TTX_MATTX)
);

/*==============================================================*/
/* Table: XE                                                    */
/*==============================================================*/
create table XE
(
   XE_MAXE              char(5) not null,
   MODEL_MAMODEL        int not null,
   XE_BIENSOXE          varchar(8) not null,
   primary key (XE_MAXE)
);

alter table BANG_GIA add constraint FK_RELATIONSHIP_24 foreign key (XE_MAXE)
      references XE (XE_MAXE);

alter table BANG_GIA add constraint FK_RELATIONSHIP_26 foreign key (CX_MACX)
      references CHU_XE (CX_MACX);

alter table BAN_GHI_TINH_TRANG add constraint FK_RELATIONSHIP_16 foreign key (XE_MAXE)
      references XE (XE_MAXE);

alter table BAN_GHI_TINH_TRANG add constraint FK_RELATIONSHIP_17 foreign key (TTX_MATTX)
      references TINH_TRANG_XE (TTX_MATTX);

alter table BAN_GHI_TINH_TRANG add constraint FK_RELATIONSHIP_18 foreign key (CNTX_MACNTX)
      references CHI_NHANH_THUE_XE (CNTX_MACNTX);

alter table CHI_NHANH_THUE_XE add constraint FK_RELATIONSHIP_19 foreign key (DUONG_MADUONG)
      references DUONG (DUONG_MADUONG);

alter table CHI_NHANH_THUE_XE add constraint FK_RELATIONSHIP_20 foreign key (CX_MACX)
      references CHU_XE (CX_MACX);

alter table DIEU_KHOAN_SU_DUNG_DV add constraint FK_RELATIONSHIP_27 foreign key (CX_MACX)
      references CHU_XE (CX_MACX);

alter table DUONG add constraint FK_RELATIONSHIP_5 foreign key (PHUONG_MAPHUONG)
      references PHUONG (PHUONG_MAPHUONG);

alter table HOP_DONG_THUE add constraint FK_RELATIONSHIP_1 foreign key (KH_SOCCCD, KH_SOGPLX)
      references KHACH_HANG (KH_SOCCCD, KH_SOGPLX);

alter table HOP_DONG_THUE add constraint FK_RELATIONSHIP_15 foreign key (CX_MACX)
      references CHU_XE (CX_MACX);

alter table HOP_DONG_THUE add constraint FK_RELATIONSHIP_2 foreign key (XE_MAXE)
      references XE (XE_MAXE);

alter table HOP_DONG_THUE add constraint FK_RELATIONSHIP_22 foreign key (DKSDDV_MADKSDDV)
      references DIEU_KHOAN_SU_DUNG_DV (DKSDDV_MADKSDDV);

alter table MODEL add constraint FK_RELATIONSHIP_21 foreign key (HX_MAHANGXE)
      references HANG_XE (HX_MAHANGXE);

alter table PHUONG add constraint FK_RELATIONSHIP_23 foreign key (TP_MATP)
      references THANH_PHO (TP_MATP);

alter table QUAN_TAM add constraint FK_RELATIONSHIP_10 foreign key (XE_MAXE)
      references XE (XE_MAXE);

alter table QUAN_TAM add constraint FK_RELATIONSHIP_9 foreign key (KH_SOCCCD, KH_SOGPLX)
      references KHACH_HANG (KH_SOCCCD, KH_SOGPLX);

alter table TIEN_ICH_XE add constraint FK_RELATIONSHIP_25 foreign key (XE_MAXE)
      references XE (XE_MAXE);

alter table XE add constraint FK_RELATIONSHIP_7 foreign key (MODEL_MAMODEL)
      references MODEL (MODEL_MAMODEL);

