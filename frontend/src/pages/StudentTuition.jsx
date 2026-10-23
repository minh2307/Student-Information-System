import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { toast } from '../store/toastStore'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  QrCode,
  FileText,
  ShieldCheck,
  Building,
  Check,
  Filter,
  Download,
  Info
} from 'lucide-react'

export const StudentTuition = () => {
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState('')
  const [tuition, setTuition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  // Tải danh sách học kỳ
  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const res = await api.get('/semesters')
        if (res.data?.data && res.data.data.length > 0) {
          setSemesters(res.data.data)
          const active = res.data.data.find(s => s.isActive) || res.data.data[0]
          setSelectedSemester(active.semesterCode)
        }
      } catch (err) {
        console.error('Lỗi tải học kỳ:', err)
        setSelectedSemester('2024-25_SEM2')
      }
    }
    loadSemesters()
  }, [])

  // Tải học phí
  useEffect(() => {
    if (!selectedSemester) return
    const fetchTuition = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/student/tuition?semester=${selectedSemester}`)
        if (res.data?.data) {
          setTuition(res.data.data)
        }
      } catch (err) {
        console.error('Lỗi tải học phí:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTuition()
  }, [selectedSemester])

  const handleConfirmPayment = async () => {
    setPaying(true)
    try {
      const res = await api.post('/student/tuition/pay', {
        semester: selectedSemester,
        paymentMethod: 'VietQR / Chuyển khoản ngân hàng 24/7'
      })
      if (res.data?.data) {
        setTuition(res.data.data)
        setPaymentSuccess(true)
        setTimeout(() => {
          setShowQrModal(false)
          setPaymentSuccess(false)
          setShowReceiptModal(true)
        }, 1200)
      }
    } catch (err) {
      toast.error('Không thể hoàn tất thanh toán: ' + (err.response?.data?.message || err.message))
    } finally {
      setPaying(false)
    }
  }

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0)
  }

  const isPaid = tuition?.status === 'PAID'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Header & Semester Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Phòng Kế Hoạch - Tài Chính • Ban Thu Học Phí
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Biểu Kê Học Phí & Nghĩa Vụ Tài Chính Sinh Viên
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Quyết toán định mức tín chỉ các lớp học phần và phương thức thanh toán trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
            <Filter size={14} className="text-stone-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-xs font-semibold text-stone-800 focus:outline-none cursor-pointer"
            >
              {semesters.map((s) => (
                <option key={s.id || s.semesterCode} value={s.semesterCode}>
                  {s.semesterName} {s.isActive ? '(Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isPaid && (
            <button
              onClick={() => setShowReceiptModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-stone-900 hover:bg-black text-white transition shadow-2xs"
            >
              <FileText size={14} />
              <span>Biên lai điện tử</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-stone-200/90 text-center">
          <div className="inline-block w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-xs text-stone-600">Đang đối soát công nợ từ cổng tài chính...</p>
        </div>
      ) : !tuition ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-stone-300 text-center">
          <p className="text-xs text-stone-600">Không tìm thấy biểu phí học phần cho kỳ đào tạo này.</p>
        </div>
      ) : (
        <>
          {/* 2. Official Financial Standing Card */}
          <div className={`rounded-2xl p-6 border shadow-2xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            isPaid
              ? 'bg-stone-50 border-stone-200/90'
              : 'bg-stone-50 border-stone-200/90'
          }`}>
            {/* Watermark Seal */}
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none w-48 h-48">
              <img src="/images/stamp-seal.svg" alt="Seal" className="w-full h-full" />
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                  isPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {isPaid ? 'ĐÃ HOÀN TẤT NGHĨA VỤ HỌC PHÍ' : 'CHƯA THANH TOÁN (CÒN NỢ)'}
                </span>
                <span className="text-xs text-stone-600 font-mono">
                  Mã học kỳ: <strong>{tuition.semesterName}</strong>
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold text-stone-900 tracking-tight">
                  {formatVnd(tuition.totalAmount)}
                </h2>
                <span className="text-xs text-stone-600 font-medium">toàn bộ định mức kỳ</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 pt-1 font-mono">
                <span>Tổng số tín chỉ: <strong className="text-stone-900">{tuition.totalCredits} TC</strong></span>
                <span>•</span>
                <span>Đơn giá học phần: <strong className="text-stone-900">{formatVnd(tuition.creditUnitPrice)} / TC</strong></span>
                <span>•</span>
                <span>Hạn chót quyết toán: <strong className="text-red-700">{tuition.dueDate || '30/04/2025'}</strong></span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!isPaid ? (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold bg-red-700 hover:bg-red-800 text-white transition shadow-2xs"
                >
                  <QrCode size={16} />
                  <span>Nộp Học Phí Trực Tuyến VietQR</span>
                </button>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs text-stone-700 space-y-1 font-mono">
                  <div>Mã biên nhận: <strong className="text-stone-900">{tuition.transactionCode}</strong></div>
                  <div>Phương thức: <span className="text-stone-800">{tuition.paymentMethod || 'VietQR 24/7'}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Breakdown Course Fee Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-stone-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-stone-900 uppercase font-mono tracking-wider">
                  Bảng Kê Chi Tiết Học Phần Thu Phí ({tuition.courses?.length || 0} môn)
                </h3>
                <span className="text-[11px] text-stone-600">
                  Căn cứ theo số tín chỉ các lớp học phần đăng ký hợp lệ trong kỳ
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-3 px-4 w-12">STT</th>
                    <th className="py-3 px-4">Mã học phần</th>
                    <th className="py-3 px-4">Tên môn học / Học phần</th>
                    <th className="py-3 px-4 text-center">Số TC</th>
                    <th className="py-3 px-4 text-right">Đơn giá / TC</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {tuition.courses?.map((c, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70 transition">
                      <td className="py-3.5 px-4 font-mono text-stone-600">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-800">{c.courseCode}</td>
                      <td className="py-3.5 px-4 font-medium text-stone-900">{c.courseName}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-semibold text-stone-800">{c.credits}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">{formatVnd(tuition.creditUnitPrice)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">{formatVnd(c.fee)}</td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50/50">
                    <td className="py-3.5 px-4 font-mono text-stone-600">-</td>
                    <td className="py-3.5 px-4 font-mono text-stone-600">FEE-LAB-LIB</td>
                    <td className="py-3.5 px-4 text-stone-700">Phí bảo trì thư viện điện tử, cơ sở vật chất phòng máy chủ</td>
                    <td className="py-3.5 px-4 text-center font-mono text-stone-600">-</td>
                    <td className="py-3.5 px-4 text-right font-mono text-stone-600">Định mức kỳ</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">{formatVnd(tuition.facilityFee)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100/80 border-t border-stone-200 text-xs font-bold font-mono">
                    <td colSpan="3" className="py-4 px-4 text-stone-900 uppercase">TỔNG CỘNG HỌC PHÍ PHẢI THANH TOÁN</td>
                    <td className="py-4 px-4 text-center text-red-800">{tuition.totalCredits} TC</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right text-sm text-red-800">{formatVnd(tuition.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Online Payment Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-wider flex items-center gap-2">
                <QrCode size={16} className="text-red-700" />
                Cổng Thanh Toán Trực Tuyến VietQR
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 text-center space-y-4">
              <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-lg text-[11px] text-stone-600 text-left">
                Quét mã VietQR chuẩn NAPAS bằng bất kỳ ứng dụng ngân hàng di động nào. Hệ thống sẽ tự động cập nhật công nợ trong vòng 60 giây.
              </div>

              {/* QR Code Container */}
              <div className="relative mx-auto w-52 h-52 bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center justify-center shadow-2xs">
                {paymentSuccess ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-700">
                    <CheckCircle2 size={48} />
                    <p className="font-bold text-xs">Giao dịch được xác nhận thành công!</p>
                  </div>
                ) : (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2024-25_SEM2_TUITION_${tuition?.totalAmount}`}
                    alt="VietQR"
                    className="w-40 h-40 object-contain"
                  />
                )}
              </div>

              <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 text-xs text-left space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-sans">Đơn vị hưởng:</span>
                  <strong className="text-stone-900">HỌC VIỆN ĐÀO TẠO RIKKEI</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-sans">Số tài khoản:</span>
                  <strong className="text-red-800">999988882025 (MB BANK)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-sans">Số tiền:</span>
                  <strong className="text-stone-900">{formatVnd(tuition?.totalAmount)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-sans">Nội dung CK:</span>
                  <strong className="text-stone-800">SV2024001 HP {tuition?.semesterName}</strong>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={paying}
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                disabled={paying || paymentSuccess}
                onClick={handleConfirmPayment}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
              >
                {paying ? (
                  <span>Đang ghi nhận...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Xác nhận đã nộp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Electronic Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 print:hidden">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                Chứng Từ Thu Học Phí Điện Tử
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition"
                >
                  <Printer size={13} />
                  <span>In chứng từ</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Official University Receipt Certificate */}
            <div className="mt-4 p-5 rounded-lg border border-stone-300 bg-stone-50/30 relative overflow-hidden space-y-4 print-card">
              {/* Circular Red University Stamp Watermark */}
              <div className="absolute right-6 top-28 opacity-15 pointer-events-none w-44 h-44 rotate-[-12deg]">
                <img src="/images/stamp-seal.svg" alt="Official Stamp" className="w-full h-full" />
              </div>

              <div className="text-center border-b border-stone-200 pb-3">
                <p className="text-[10px] font-mono font-semibold text-stone-500 uppercase tracking-wider">
                  BỘ GIÁO DỤC VÀ ĐÀO TẠO • HỌC VIỆN CÔNG NGHỆ RIKKEI
                </p>
                <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 uppercase mt-0.5 tracking-tight">
                  PHIẾU XÁC NHẬN NỘP HỌC PHÍ ĐIỆN TỬ
                </h3>
                <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                  Mã giao dịch / Số chứng từ: <span className="font-bold text-stone-900">{tuition?.transactionCode || 'TXN-2025'}</span>
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Sinh viên:</span>
                  <span className="font-bold text-stone-900">Nguyễn Văn C (MSSV: SV2024001)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Học kỳ đào tạo:</span>
                  <span className="font-bold text-stone-800">{tuition?.semesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Số tín chỉ quyết toán:</span>
                  <span className="font-bold font-mono text-stone-800">{tuition?.totalCredits} TC</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold">
                  <span className="text-stone-800">Số tiền đã quyết toán:</span>
                  <span className="font-mono text-red-800">{formatVnd(tuition?.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Phương thức:</span>
                  <span className="font-medium text-stone-800">{tuition?.paymentMethod || 'VietQR'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Thời điểm ghi nhận:</span>
                  <span className="font-mono text-stone-700">{new Date().toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-200 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <ShieldCheck size={16} />
                  <span>Ký số điện tử SHA-256 xác thực</span>
                </div>
                <div className="text-right text-stone-600 italic text-[11px]">
                  Phòng Kế hoạch - Tài chính
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end print:hidden">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentTuition
