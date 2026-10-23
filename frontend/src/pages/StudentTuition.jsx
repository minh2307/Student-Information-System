import React, { useState, useEffect } from 'react'
import api from '../services/api'
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
  Sparkles,
  ArrowRight,
  Filter,
  Check
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
        paymentMethod: 'VietQR / Chuyển khoản ngân hàng'
      })
      if (res.data?.data) {
        setTuition(res.data.data)
        setPaymentSuccess(true)
        setTimeout(() => {
          setShowQrModal(false)
          setPaymentSuccess(false)
          setShowReceiptModal(true)
        }, 1500)
      }
    } catch (err) {
      alert('Không thể hoàn tất thanh toán: ' + (err.response?.data?.message || err.message))
    } finally {
      setPaying(false)
    }
  }

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0)
  }

  const isPaid = tuition?.status === 'PAID'

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tra Cứu Học Phí & Công Nợ</h1>
            <p className="text-xs text-slate-500">Chi tiết học phí các học phần đã đăng ký và tình trạng nộp học phí</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter size={15} className="text-slate-500" />
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
            >
              <FileText size={15} />
              <span>Xem Biên Lai</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center">
          <div className="inline-block w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-3 text-sm text-slate-500">Đang tải thông tin công nợ học phí...</p>
        </div>
      ) : !tuition ? (
        <div className="bg-white rounded-2xl p-12 border border-dashed border-slate-300 text-center">
          <p className="text-sm text-slate-500">Chưa có thông tin học phí cho học kỳ này.</p>
        </div>
      ) : (
        <>
          {/* Tuition Status Card */}
          <div className={`rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
            isPaid
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-200'
              : 'bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-amber-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                isPaid ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {isPaid ? <CheckCircle2 size={26} /> : <AlertCircle size={26} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isPaid ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {isPaid ? 'Đã thanh toán đủ' : 'Chưa nộp học phí'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">Học kỳ: {tuition.semesterName}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatVnd(tuition.totalAmount)}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-2">
                  <span>Tổng tín chỉ: <strong className="text-slate-900">{tuition.totalCredits} TC</strong></span>
                  <span>•</span>
                  <span>Đơn giá: <strong className="text-slate-900">{formatVnd(tuition.creditUnitPrice)} / TC</strong></span>
                  <span>•</span>
                  <span>Hạn nộp: <strong className="text-rose-600">{tuition.dueDate || '30/04/2025'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!isPaid ? (
                <button
                  onClick={() => setShowQrModal(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-amber-600 hover:bg-amber-700 text-white transition shadow-md shadow-amber-600/20"
                >
                  <QrCode size={18} />
                  <span>Nộp Học Phí Trực Tuyến</span>
                </button>
              ) : (
                <div className="bg-white/80 backdrop-blur-xs p-3 rounded-xl border border-emerald-200 text-xs text-slate-700 space-y-1">
                  <div>Mã GD: <strong className="font-mono text-emerald-800">{tuition.transactionCode}</strong></div>
                  <div>Hình thức: <span className="font-medium text-slate-800">{tuition.paymentMethod || 'VietQR'}</span></div>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Courses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">
                Chi tiết các khoản phí học phần trong kỳ ({tuition.courses?.length || 0} môn)
              </h3>
              <span className="text-xs text-slate-500">Căn cứ vào số tín chỉ các lớp học phần đã đăng ký</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã môn</th>
                    <th className="py-3 px-4">Tên môn học / Học phần</th>
                    <th className="py-3 px-4 text-center">Số tín chỉ</th>
                    <th className="py-3 px-4 text-right">Đơn giá / TC</th>
                    <th className="py-3 px-4 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tuition.courses?.map((c, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-700">{c.courseCode}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{c.courseName}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">{c.credits}</td>
                      <td className="py-3.5 px-4 text-right text-slate-500">{formatVnd(tuition.creditUnitPrice)}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatVnd(c.fee)}</td>
                    </tr>
                  ))}
                  {/* Fixed Facility Fee */}
                  <tr className="bg-slate-50/40 font-medium">
                    <td className="py-3.5 px-4 font-mono text-slate-400">-</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">FEE-FACILITY</td>
                    <td className="py-3.5 px-4 text-slate-700">Phí cơ sở vật chất, thư viện điện tử & bảo trì phòng Lab</td>
                    <td className="py-3.5 px-4 text-center text-slate-400">-</td>
                    <td className="py-3.5 px-4 text-right text-slate-400">Định mức kỳ</td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatVnd(tuition.facilityFee)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/70 border-t-2 border-slate-200 text-sm font-bold">
                    <td colSpan="3" className="py-4 px-4 text-slate-800">TỔNG CỘNG HỌC PHÍ PHẢI NỘP</td>
                    <td className="py-4 px-4 text-center text-red-700">{tuition.totalCredits} TC</td>
                    <td className="py-4 px-4"></td>
                    <td className="py-4 px-4 text-right text-base text-red-700">{formatVnd(tuition.totalAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Online Payment QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode size={18} className="text-amber-600" />
                Cổng Thanh Toán Trực Tuyến
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 text-center space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-800">
                Quét mã VietQR bằng ứng dụng Ngân hàng (MB, Vietcombank, Techcombank...) hoặc Momo để nộp học phí tức thì.
              </div>

              {/* Mock QR Code Display */}
              <div className="relative mx-auto w-56 h-56 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-col items-center justify-center">
                {paymentSuccess ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-600 animate-in zoom-in">
                    <CheckCircle2 size={54} />
                    <p className="font-bold text-sm">Giao dịch thành công!</p>
                  </div>
                ) : (
                  <>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=2024-25_SEM2_TUITION_${tuition.totalAmount}`}
                      alt="VietQR Học phí"
                      className="w-44 h-44 rounded-lg object-contain"
                    />
                    <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none"></div>
                  </>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-left space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Đơn vị thụ hưởng:</span>
                  <span className="font-bold text-slate-800">TRUONG DH RIKKEI</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Số tài khoản:</span>
                  <span className="font-bold text-red-700">999988882025 (MB Bank)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Số tiền:</span>
                  <span className="font-bold text-rose-600 font-sans">{formatVnd(tuition.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Nội dung CK:</span>
                  <span className="font-bold text-slate-800">SV2024001 HP {tuition.semesterName}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                disabled={paying}
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                disabled={paying || paymentSuccess}
                onClick={handleConfirmPayment}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                {paying ? (
                  <span>Đang xử lý giao dịch...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Xác nhận đã nộp</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Electronic Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Biên lai thu học phí điện tử
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  <Printer size={13} />
                  <span>In phiếu</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Receipt Form */}
            <div className="mt-4 p-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-4">
              <div className="text-center border-b border-slate-200 pb-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase">BỘ GIÁO DỤC VÀ ĐÀO TẠO</p>
                <h3 className="text-base font-extrabold text-red-900">CỔNG ĐÀO TẠO RIKKEI EDUPORTAL</h3>
                <h4 className="text-sm font-bold text-slate-800 mt-1 uppercase">PHIẾU THU TIỀN HỌC PHÍ ĐIỆN TỬ</h4>
                <p className="text-[11px] font-mono text-slate-400 mt-0.5">Số biên nhận: {tuition?.transactionCode || 'TXN-2025'}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Họ và tên sinh viên:</span>
                  <span className="font-bold text-slate-900">Nguyễn Văn C (SV2024001)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Học kỳ:</span>
                  <span className="font-bold text-slate-800">{tuition?.semesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng số tín chỉ thu phí:</span>
                  <span className="font-bold text-slate-800">{tuition?.totalCredits} Tín chỉ</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                  <span className="text-slate-700">Tổng số tiền đã thanh toán:</span>
                  <span className="text-emerald-700">{formatVnd(tuition?.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hình thức nộp:</span>
                  <span className="font-medium text-slate-800">{tuition?.paymentMethod || 'VietQR Chuyển khoản'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian giao dịch:</span>
                  <span className="font-mono text-slate-700">{new Date().toLocaleString('vi-VN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <ShieldCheck size={16} />
                  <span>Xác thực ký số điện tử hợp lệ</span>
                </div>
                <div className="text-right italic">
                  Phòng Kế hoạch - Tài chính
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end print:hidden">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition"
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
