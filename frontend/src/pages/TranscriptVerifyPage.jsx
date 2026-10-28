import React, { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Calendar,
  Lock,
  Building,
  ArrowLeft,
  Loader2,
  FileText,
  BadgeCheck
} from 'lucide-react'
import api from '../services/api'

export function TranscriptVerifyPage() {
  const [searchParams] = useSearchParams()
  const serial = searchParams.get('serial') || ''
  const sig = searchParams.get('sig') || ''

  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)

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

  const cred = result?.credential

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        
        {/* Brand Banner */}
        <div className="text-center space-y-1">
          <span className="text-[11px] font-mono font-black text-red-800 uppercase tracking-widest block">
            Học Viện Công Nghệ Rikkei • Cổng Tra Cứu Văn Bằng & Chứng Chỉ Số
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Xác Thực Tính Toàn Vẹn Bảng Điểm Số
          </h1>
          <p className="text-xs text-slate-500">
            Hệ thống đối soát mật mã học phòng chống giả mạo hồ sơ học vụ
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-red-700 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Đang kiểm tra chữ ký mật mã HMAC-SHA256...</p>
              <p className="text-xs text-slate-400 font-mono">Serial: {serial}</p>
            </div>
          ) : result?.valid && cred ? (
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Green Verified Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3.5 shadow-2xs">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0">
                  <BadgeCheck size={28} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-wide">
                    BẢNG ĐIỂM SỐ XÁC THỰC HỢP LỆ
                  </h2>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    Hồ sơ học tập chính hãng, toàn vẹn và không bị can thiệp trái phép.
                  </p>
                </div>
              </div>

              {/* Student Dossier Table */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    Thông Tin Đối Soát Hồ Sơ Sinh Viên
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Họ và tên sinh viên</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{cred.fullName}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Mã số sinh viên (MSSV)</span>
                    <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{cred.studentCode}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Chuyên ngành đào tạo</span>
                    <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{cred.major}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Điểm CGPA tích lũy</span>
                    <span className="font-mono font-black text-red-700 text-base mt-0.5 block">
                      {cred.cgpa} <span className="text-xs font-normal text-slate-500">/ 10.0</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Số tín chỉ hoàn thành</span>
                    <span className="font-mono font-bold text-slate-800 text-xs mt-0.5 block">
                      {cred.creditsEarned} / {cred.totalRequiredCredits} Tín chỉ
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-500 block">Xếp loại học vụ</span>
                    <span className="font-bold text-amber-900 text-xs mt-0.5 block">
                      {cred.academicStanding}
                    </span>
                  </div>
                </div>

                {/* Audit Certificate Metadata */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-slate-600 gap-2">
                    <span>Mã Serial chứng thư: <strong className="font-mono text-slate-900">{cred.serial}</strong></span>
                    <span>Thời điểm xác thực: <span className="font-mono">{result.verifiedAt}</span></span>
                  </div>
                  <div className="text-slate-600">
                    <span>Đơn vị cấp văn bằng: <strong className="text-slate-900">{cred.issuer}</strong></span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-1">Chữ ký mật mã HMAC-SHA256:</span>
                    <div className="font-mono text-[10px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 break-all select-all">
                      {cred.signature}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            /* Red Invalid Banner */
            <div className="p-6 sm:p-8 space-y-6 text-center">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-rose-600 text-white">
                  <ShieldAlert size={36} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-rose-950 uppercase">
                    CẢNH BÁO: CHỨNG CHỈ KHÔNG HỢP LỆ!
                  </h2>
                  <p className="text-xs text-rose-800 font-semibold mt-1">
                    {result?.message || 'Bảng điểm này không tồn tại hoặc chữ ký mật mã đã bị làm giả/thay đổi.'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 text-left font-mono">
                <div>Mã Serial kiểm tra: <strong>{serial || '(Trống)'}</strong></div>
                <div className="break-all">Chữ ký kiểm tra: {sig || '(Trống)'}</div>
                <div className="text-rose-700 font-bold mt-2">
                  Lưu ý: Mọi hành vi sửa điểm hoặc giả mạo văn bằng chứng chỉ học vụ đều vi phạm nghiêm trọng quy chế đào tạo và pháp luật hiện hành.
                </div>
              </div>
            </div>
          )}

          {/* Footer Back Button */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <Link
              to="/login"
              className="text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold transition"
            >
              <ArrowLeft size={14} />
              <span>Vào Cổng Đăng Nhập Sinh Viên</span>
            </Link>
            <span className="text-slate-400 font-mono text-[11px]">Rikkei EduPortal Verifiable Credentials</span>
          </div>

        </div>

      </div>

      <footer className="text-center text-[11px] text-slate-400 mt-6">
        © 2025 Học Viện Công Nghệ Rikkei • Bảo lưu mọi bản quyền
      </footer>
    </div>
  )
}
export default TranscriptVerifyPage
