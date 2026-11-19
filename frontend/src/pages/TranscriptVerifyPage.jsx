import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ShieldAlert,
  Printer,
  Copy,
  Check,
  Loader2,
  BadgeCheck,
  GraduationCap,
  Calendar,
  Lock,
  Building2,
  FileCheck2,
  CheckCircle2
} from 'lucide-react'
import api from '../services/api'

export function TranscriptVerifyPage() {
  const [searchParams] = useSearchParams()
  const serial = searchParams.get('serial') || ''
  const sig = searchParams.get('sig') || searchParams.get('signature') || ''

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    verify()
  }, [serial, sig])

  const verify = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/public/credentials/verify?serial=${encodeURIComponent(serial)}&sig=${encodeURIComponent(sig)}`)
      setResult(res.data?.data)
    } catch (err) {
      setResult({
        valid: false,
        serial,
        message: 'Lỗi kết nối máy chủ xác thực: ' + (err.response?.data?.message || err.message)
      })
    } finally {
      setLoading(false)
    }
  }

  const copyCurrentUrl = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  const cred = result?.credential

  return (
    <div className="min-h-screen bg-slate-100/90 flex flex-col justify-between p-4 sm:p-8 font-sans antialiased text-slate-900">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        
        {/* Brand Banner */}
        <div className="text-center space-y-1.5 print:mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100/80 border border-red-300 rounded-full text-red-900 text-xs font-mono font-bold uppercase tracking-wider">
            <Building2 size={13} className="text-red-700" />
            <span>Học Viện Công Nghệ Rikkei • Rikkei Academy of Technology</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Xác Thực Tính Toàn Vẹn Bảng Điểm Số
          </h1>
          <p className="text-sm font-medium text-slate-600 max-w-lg mx-auto">
            Hệ thống đối soát mật mã học phòng chống giả mạo văn bằng và hồ sơ học vụ
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-300/80 overflow-hidden print:shadow-none print:border-none">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-red-700 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">Đang kiểm tra chữ ký mật mã HMAC-SHA256...</p>
              <p className="text-xs text-slate-500 font-mono">Mã Serial: {serial || 'Đang xử lý'}</p>
            </div>
          ) : result?.valid && cred ? (
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Green Verified Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-400 flex items-center gap-4 shadow-xs">
                <div className="p-2.5 rounded-2xl bg-emerald-700 text-white shrink-0 shadow-xs">
                  <BadgeCheck size={32} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-wide">
                    CHỨNG NHẬN BẢNG ĐIỂM HỢP LỆ & NGUYÊN BẢN
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-900 font-semibold mt-0.5">
                    Hồ sơ học tập chính hãng, dữ liệu toàn vẹn và không bị can thiệp trái phép.
                  </p>
                </div>
              </div>

              {/* Student Dossier Table */}
              <div className="space-y-4">
                <div className="border-b-2 border-slate-200 pb-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 size={16} className="text-red-700" />
                    Thông Tin Đối Soát Hồ Sơ Học Vụ
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Trạng thái: <strong className="text-emerald-700">Chính thức</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Họ và tên sinh viên</span>
                    <span className="font-extrabold text-slate-900 text-base mt-1 block">{cred.fullName}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Mã số sinh viên (MSSV)</span>
                    <span className="font-mono font-extrabold text-slate-900 text-base mt-1 block">{cred.studentCode}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Chuyên ngành đào tạo</span>
                    <span className="font-bold text-slate-900 text-sm mt-1 block">{cred.major}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Điểm CGPA tích lũy</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="font-mono font-black text-red-700 text-xl">{cred.cgpa}</span>
                      <span className="text-xs font-semibold text-slate-500">/ 10.0</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Số tín chỉ hoàn thành</span>
                    <span className="font-mono font-extrabold text-slate-900 text-sm mt-1 block">
                      {cred.creditsEarned} / {cred.totalRequiredCredits} Tín chỉ
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-300">
                    <span className="text-xs font-semibold text-slate-600 block">Xếp loại học lực</span>
                    <span className="inline-block mt-1 px-3 py-1 rounded-md bg-amber-100 border border-amber-400 text-amber-950 font-black text-xs">
                      {cred.academicStanding}
                    </span>
                  </div>
                </div>

                {/* Audit Certificate Metadata */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-xs space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between text-slate-700 gap-2 font-medium">
                    <span>Mã Serial chứng thư: <strong className="font-mono font-bold text-slate-900">{cred.serial}</strong></span>
                    <span>Thời điểm xác thực: <strong className="font-mono text-slate-900">{result.verifiedAt}</strong></span>
                  </div>
                  <div className="text-slate-700 font-medium">
                    <span>Đơn vị cấp văn bằng: <strong className="text-slate-900">{cred.issuer}</strong></span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                      <Lock size={12} className="text-slate-600" />
                      Chữ ký số mật mã (HMAC-SHA256):
                    </span>
                    <div className="font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-300 break-all select-all font-medium leading-relaxed shadow-2xs">
                      {cred.signature}
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Bar (Optimized, No redundant login button) */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <button
                  onClick={copyCurrentUrl}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-300 shadow-2xs cursor-pointer"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Đã sao chép liên kết' : 'Sao chép liên kết đối soát'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <Printer size={14} />
                  <span>In / Lưu Kết Quả Xác Thực</span>
                </button>
              </div>

            </div>
          ) : (
            /* Red Invalid Banner */
            <div className="p-6 sm:p-8 space-y-6 text-center">
              <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-400 flex flex-col items-center gap-3">
                <div className="p-3.5 rounded-full bg-rose-700 text-white shadow-xs">
                  <ShieldAlert size={40} />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-black text-rose-950 uppercase">
                    CẢNH BÁO: CHỨNG CHỈ KHÔNG HỢP LỆ!
                  </h2>
                  <p className="text-xs sm:text-sm text-rose-900 font-bold mt-1.5 max-w-md mx-auto">
                    {result?.message || 'Bảng điểm này không tồn tại trong cơ sở dữ liệu học viện hoặc chữ ký số mật mã đã bị làm giả/thay đổi trái phép.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-700 space-y-2 text-left font-mono">
                <div>Mã Serial kiểm tra: <strong className="text-slate-900">{serial || '(Trống)'}</strong></div>
                <div className="break-all">Chữ ký kiểm tra: <span className="text-slate-800">{sig || '(Trống)'}</span></div>
                <div className="text-rose-800 font-bold mt-2 pt-2 border-t border-slate-200 font-sans">
                  ⚠️ Lưu ý pháp lý: Mọi hành vi sửa điểm, can thiệp chữ ký số hoặc giả mạo văn bằng chứng chỉ học vụ đều vi phạm nghiêm trọng quy chế đào tạo và pháp luật hiện hành.
                </div>
              </div>

              <div className="pt-2 print:hidden">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      <footer className="text-center text-xs font-medium text-slate-500 mt-6 print:hidden">
        Hệ thống chứng chỉ số bảo mật Rikkei EduPortal • Bản quyền thuộc về Học Viện Công Nghệ Rikkei
      </footer>
    </div>
  )
}

export default TranscriptVerifyPage
