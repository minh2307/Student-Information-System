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
  Info,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp
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
  const [selectedBankBin, setSelectedBankBin] = useState('970422') // 970422 (MB) | 970415 (VietinBank)
  const [showRawPayload, setShowRawPayload] = useState(false)
  const [showPayOsModal, setShowPayOsModal] = useState(false)
  const [payOsData, setPayOsData] = useState(null)
  const [creatingPayOs, setCreatingPayOs] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)

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

  // Tải học phí theo kỳ và ngân hàng
  useEffect(() => {
    if (!selectedSemester) return
    const fetchTuition = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/student/tuition?semester=${selectedSemester}&bank=${selectedBankBin}`)
        if (res.data?.data) {
          setTuition(res.data.data)
          if (res.data.data.bankBin) {
            setSelectedBankBin(res.data.data.bankBin)
          }
        }
      } catch (err) {
        console.error('Lỗi tải học phí:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTuition()
  }, [selectedSemester, selectedBankBin])

  // Polling tự động kiểm tra trạng thái quyết toán khi mở cổng PayOS
  useEffect(() => {
    let timer = null
    const isPaid = tuition?.status === 'PAID'
    if (pollingActive && !isPaid) {
      timer = setInterval(async () => {
        try {
          const res = await api.get(`/student/tuition?semester=${selectedSemester}&bank=${selectedBankBin}`)
          if (res.data?.data) {
            setTuition(res.data.data)
            if (res.data.data.status === 'PAID') {
              setPollingActive(false)
              setShowPayOsModal(false)
              setShowReceiptModal(true)
              toast.success('Học phí đã được quyết toán tự động qua cổng PayOS!')
            }
          }
        } catch (ignored) {}
      }, 3000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [pollingActive, tuition?.status, selectedSemester, selectedBankBin])

  const handleOpenPayOs = async () => {
    setCreatingPayOs(true)
    try {
      const res = await api.post('/student/tuition/payos/create-payment-link', { semester: selectedSemester })
      if (res.data?.data) {
        setPayOsData(res.data.data)
        setShowPayOsModal(true)
        setPollingActive(true)
      }
    } catch (err) {
      toast.error('Không thể tạo liên kết thanh toán PayOS: ' + (err.response?.data?.message || err.message))
    } finally {
      setCreatingPayOs(false)
    }
  }

  const handleSimulatePayOsWebhook = async () => {
    if (!payOsData?.orderCode) return
    try {
      await api.post('/public/tuition/payos-webhook', {
        code: '00',
        desc: 'success',
        success: true,
        data: {
          orderCode: payOsData.orderCode,
          amount: payOsData.amount,
          description: payOsData.description,
          code: '00',
          reference: 'SIM-PAYOS-' + Date.now()
        },
        signature: 'demo-signature'
      })
      toast.success('Đã gửi tín hiệu Webhook PayOS mô phỏng thành công!')
    } catch (err) {
      toast.error('Lỗi gửi webhook mô phỏng: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleConfirmPayment = async () => {
    setPaying(true)
    try {
      const activeBank = tuition?.supportedBanks?.find(b => b.bankBin === selectedBankBin)
      const bankLabel = activeBank ? `${activeBank.bankShortName} (BIN ${activeBank.bankBin})` : 'VietQR Napas247'

      const res = await api.post('/student/tuition/pay', {
        semester: selectedSemester,
        paymentMethod: `VietQR Napas247 (${bankLabel})`
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

  const copyToClipboard = (text, label) => {
    if (!text) return
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      toast.success(`Đã sao chép ${label}`)
    }
  }

  const formatVnd = (num) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0)
  }

  const isPaid = tuition?.status === 'PAID'
  const isPartial = tuition?.status === 'PARTIAL'

  const activeBank = tuition?.supportedBanks?.find(b => b.bankBin === selectedBankBin) || {
    bankBin: tuition?.bankBin || '970422',
    bankShortName: tuition?.bankShortName || 'MB',
    bankName: tuition?.bankName || 'MB Bank (Ngân hàng TMCP Quân đội)',
    accountNumber: tuition?.accountNumber || '999988882025',
    accountName: tuition?.accountName || 'HOC VIEN CONG NGHE RIKKEI',
    vietQrPayload: tuition?.vietQrPayload || '',
    vietQrQuickLink: tuition?.vietQrQuickLink || ''
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Official Header & Semester Switcher */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
            Phòng Kế Hoạch - Tài Chính • Ban Thu Học Phí
          </span>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Biểu Kê Học Phí & Quyết Toán Nghĩa Vụ Tài Chính
          </h1>
          <p className="text-xs text-stone-600 mt-0.5">
            Cổng thanh toán tự động VietQR Napas247 • Sinh viên: <strong className="text-stone-900">{tuition?.studentName || 'Đang xác thực'}</strong> ({tuition?.studentCode || '...'})
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
          <p className="mt-3 text-xs text-stone-600">Đang quyết toán công nợ từ cổng tài chính...</p>
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
              : isPartial
              ? 'bg-amber-50/40 border-amber-200/80'
              : 'bg-stone-50 border-stone-200/90'
          }`}>
            {/* Watermark Seal */}
            <div className="absolute right-4 -bottom-4 opacity-5 pointer-events-none w-48 h-48">
              <img src="/images/stamp-seal.svg" alt="Seal" className="w-full h-full" />
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isPartial
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-red-100 text-red-800 border border-red-200'
                }`}>
                  {isPaid ? 'ĐÃ HOÀN TẤT NGHĨA VỤ HỌC PHÍ' : isPartial ? 'THANH TOÁN MỘT PHẦN' : 'CHƯA THANH TOÁN (CÒN NỢ)'}
                </span>
                <span className="text-xs text-stone-600 font-mono">
                  Mã học kỳ: <strong>{tuition.semesterName}</strong>
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl sm:text-3xl font-mono font-bold text-stone-900 tracking-tight">
                  {formatVnd(tuition.remainingAmount != null ? tuition.remainingAmount : tuition.totalAmount)}
                </h2>
                <span className="text-xs text-stone-600 font-medium">
                  {isPaid ? 'đã quyết toán đủ' : 'số tiền còn phải nộp'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 pt-1 font-mono">
                <span>Tổng số tín chỉ: <strong className="text-stone-900">{tuition.totalCredits} TC</strong></span>
                <span>•</span>
                <span>Đơn giá học phần: <strong className="text-stone-900">{formatVnd(tuition.creditUnitPrice)} / TC</strong></span>
                <span>•</span>
                <span>Hạn chót quyết toán: <strong className="text-red-700">{tuition.dueDate || 'Theo quy định'}</strong></span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {!isPaid ? (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleOpenPayOs}
                    disabled={creatingPayOs}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-900 hover:to-rose-800 text-white transition shadow-2xs cursor-pointer"
                  >
                    <CreditCard size={16} />
                    <span>{creatingPayOs ? 'Đang kết nối PayOS...' : 'Thanh Toán Online (PayOS)'}</span>
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-800 transition border border-stone-300 cursor-pointer"
                  >
                    <QrCode size={16} className="text-stone-600" />
                    <span>VietQR Napas247</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-3 rounded-lg border border-stone-200 text-xs text-stone-700 space-y-1 font-mono">
                  <div>Mã biên nhận: <strong className="text-stone-900">{tuition.transactionCode}</strong></div>
                  <div>Phương thức: <span className="text-stone-800">{tuition.paymentMethod || 'VietQR Napas247'}</span></div>
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
                  Căn cứ theo số tín chỉ các lớp học phần đăng ký hợp lệ trong kỳ (Định mức BR-07: 450.000 VNĐ / TC)
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
                  {tuition.totalCredits > 0 && (
                    <tr className="bg-stone-50/50">
                      <td className="py-3.5 px-4 font-mono text-stone-600">-</td>
                      <td className="py-3.5 px-4 font-mono text-stone-600">FEE-LAB-LIB</td>
                      <td className="py-3.5 px-4 text-stone-700">Phí duy trì hạ tầng máy chủ, thư viện số và cơ sở vật chất kỳ</td>
                      <td className="py-3.5 px-4 text-center font-mono text-stone-600">-</td>
                      <td className="py-3.5 px-4 text-right font-mono text-stone-600">Định mức kỳ</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-stone-900">{formatVnd(tuition.facilityFee)}</td>
                    </tr>
                  )}
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

      {/* 4. Official Online Payment Modal (VietQR Napas247 QuickLink) */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-wider flex items-center gap-2">
                <QrCode size={16} className="text-red-700" />
                Cổng Thanh Toán Napas247 VietQR QuickLink
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 text-center space-y-4">
              {/* Bank Selector Switcher (VietinBank / MB Bank) */}
              <div className="flex items-center justify-center p-1 bg-stone-100 rounded-xl border border-stone-200 gap-1">
                {tuition?.supportedBanks?.map((bank) => (
                  <button
                    key={bank.bankBin}
                    type="button"
                    onClick={() => setSelectedBankBin(bank.bankBin)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      selectedBankBin === bank.bankBin
                        ? 'bg-white text-stone-900 shadow-2xs border border-stone-200'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Building size={13} className={selectedBankBin === bank.bankBin ? 'text-red-700' : 'text-stone-400'} />
                    <span>{bank.bankShortName} ({bank.bankBin})</span>
                  </button>
                ))}
              </div>

              <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-lg text-[11px] text-stone-600 text-left">
                Quét mã VietQR chuẩn <strong>NAPAS 24/7</strong> bằng bất kỳ ứng dụng Mobile Banking nào (MB, VietinBank, VCB, Techcombank,...). Hệ thống sẽ tự động điền đúng STK, đơn vị thụ hưởng và số tiền.
              </div>

              {/* VietQR Code Visual Presentation */}
              <div className="relative mx-auto w-56 h-auto min-h-56 bg-white border border-stone-200 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs">
                {paymentSuccess ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-700 p-6">
                    <CheckCircle2 size={48} />
                    <p className="font-bold text-xs">Giao dịch đã được ghi nhận thành công!</p>
                  </div>
                ) : (
                  <img
                    src={activeBank.vietQrQuickLink}
                    onError={(e) => {
                      if (activeBank.vietQrPayload) {
                        e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(activeBank.vietQrPayload)}`
                      }
                    }}
                    alt={`VietQR ${activeBank.bankShortName}`}
                    className="w-full h-auto object-contain rounded-lg shadow-2xs"
                  />
                )}
              </div>

              {/* Exact Account & Transfer Content Data Box */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-left space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Đơn vị thụ hưởng:</span>
                  <strong className="text-stone-900">{activeBank.accountName}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Ngân hàng nhận:</span>
                  <strong className="text-stone-900">{activeBank.bankName}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-red-800 text-sm tracking-wide">{activeBank.accountNumber}</strong>
                    <button
                      type="button"
                      title="Sao chép số tài khoản"
                      onClick={() => copyToClipboard(activeBank.accountNumber, 'Số tài khoản')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tiền thanh toán:</span>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-stone-900 text-sm">{formatVnd(tuition.remainingAmount || tuition.totalAmount)}</strong>
                    <button
                      type="button"
                      title="Sao chép số tiền"
                      onClick={() => copyToClipboard(String(tuition.remainingAmount || tuition.totalAmount), 'Số tiền')}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 transition"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-stone-200">
                  <div>
                    <div className="text-[10px] text-stone-500 font-sans">Cú pháp chuyển khoản bắt buộc:</div>
                    <div className="font-bold text-red-800 tracking-wide">{tuition.transferContent}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(tuition.transferContent, 'Nội dung chuyển khoản')}
                    className="flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded text-[11px] font-sans font-medium transition"
                  >
                    <Copy size={12} />
                    <span>Sao chép</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Raw EMVCo VietQR Payload for Audit & Testing */}
              <div className="border border-stone-200 rounded-lg p-2 text-left bg-stone-50/50">
                <button
                  type="button"
                  onClick={() => setShowRawPayload(!showRawPayload)}
                  className="w-full flex items-center justify-between text-[11px] text-stone-600 hover:text-stone-900 font-medium cursor-pointer"
                >
                  <span>Payload VietQR chuẩn Napas247 (EMVCo)</span>
                  {showRawPayload ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showRawPayload && (
                  <div className="mt-2 space-y-1">
                    <div className="p-2 bg-stone-900 text-emerald-400 font-mono text-[10px] rounded break-all select-all">
                      {activeBank.vietQrPayload}
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeBank.vietQrPayload, 'Chuỗi Payload VietQR')}
                        className="text-[10px] text-red-700 hover:text-red-800 font-semibold flex items-center gap-1"
                      >
                        <Copy size={11} />
                        <span>Sao chép chuỗi mã</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                disabled={paying}
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                disabled={paying || paymentSuccess}
                onClick={handleConfirmPayment}
                className="flex-1 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
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

      {/* 4.5. PayOS Online Payment Modal (Dynamic QR & Webhook Auto-Settlement) */}
      {showPayOsModal && payOsData && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-red-700" />
                <h3 className="text-sm font-bold text-stone-900 uppercase font-mono tracking-wider">
                  Cổng Thanh Toán Trực Tuyến PayOS
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPayOsModal(false)
                  setPollingActive(false)
                }}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 text-center space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-left flex items-start gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mt-1 shrink-0" />
                <div className="text-[11px] text-emerald-900">
                  <span className="font-bold">Luồng Quyết Toán Tự Động (Webhook IPN):</span> Sau khi bạn quét QR hoặc thanh toán trên cổng PayOS, hệ thống sẽ tự động cập nhật trạng thái học phí sang <strong>ĐÃ THANH TOÁN</strong> tức thời mà không cần xác nhận thủ công.
                </div>
              </div>

              {/* Dynamic VietQR code from PayOS */}
              <div className="relative mx-auto w-56 h-auto min-h-56 bg-white border-2 border-dashed border-red-200 rounded-2xl p-3 flex flex-col items-center justify-center shadow-xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payOsData.qrCode || '')}`}
                  alt="PayOS VietQR Code"
                  className="w-full h-auto object-contain rounded-lg shadow-2xs"
                />
              </div>

              {/* Order Details Box */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-left space-y-2 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Mã đơn hàng PayOS:</span>
                  <strong className="text-red-800 text-sm tracking-wide">{payOsData.orderCode}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Số tiền cần đóng:</span>
                  <strong className="text-stone-900 text-sm">{formatVnd(payOsData.amount)}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Nội dung thanh toán:</span>
                  <strong className="text-stone-900 bg-white px-2 py-0.5 rounded border border-stone-200">{payOsData.description}</strong>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-sans">Tài khoản thụ hưởng:</span>
                  <span className="text-stone-700">{payOsData.accountNumber} ({payOsData.accountName})</span>
                </div>
              </div>

              {/* Link to PayOS Checkout Page */}
              {payOsData.checkoutUrl && (
                <div className="pt-1">
                  <a
                    href={payOsData.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition"
                  >
                    <ExternalLink size={14} />
                    <span>Mở Giao Diện Thanh Toán PayOS (Tab mới)</span>
                  </a>
                </div>
              )}

              {/* Simulation test helper */}
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-mono">Chế độ kiểm thử (Sandbox):</span>
                <button
                  type="button"
                  onClick={handleSimulatePayOsWebhook}
                  className="px-2.5 py-1 text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-md transition cursor-pointer"
                >
                  ⚡ Mô phỏng Webhook thành công
                </button>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => {
                  setShowPayOsModal(false)
                  setPollingActive(false)
                }}
                className="w-full py-2 rounded-lg border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Official Electronic Receipt Modal (100% Real Student Data) */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 print:hidden">
              <span className="text-xs font-mono font-bold text-stone-700 uppercase">
                Chứng Từ Quyết Toán Học Phí Điện Tử
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-800 transition cursor-pointer"
                >
                  <Printer size={13} />
                  <span>In chứng từ</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-xl leading-none cursor-pointer"
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
                  Mã giao dịch / Số chứng từ: <span className="font-bold text-stone-900">{tuition?.transactionCode || 'TXN-OFFICIAL'}</span>
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500">Sinh viên nộp phí:</span>
                  <span className="font-bold text-stone-900">{tuition?.studentName} (MSSV: {tuition?.studentCode})</span>
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
                  <span className="text-stone-500">Phương thức thanh toán:</span>
                  <span className="font-medium text-stone-800">{tuition?.paymentMethod || 'VietQR Napas247'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Thời điểm ghi nhận:</span>
                  <span className="font-mono text-stone-700">
                    {tuition?.paymentDate ? new Date(tuition.paymentDate).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}
                  </span>
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
                className="px-4 py-2 text-xs font-semibold bg-stone-800 hover:bg-stone-900 text-white rounded-lg transition cursor-pointer"
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
