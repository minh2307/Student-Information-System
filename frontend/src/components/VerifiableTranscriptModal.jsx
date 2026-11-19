import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  X,
  Loader2,
  Lock,
  QrCode
} from 'lucide-react'
import api from '../services/api'
import { toast } from '../store/toastStore'

export function VerifiableTranscriptModal({ open, onClose }) {
  if (!open) return null

  const [loading, setLoading] = useState(true)
  const [credential, setCredential] = useState(null)
  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    fetchCredential()
  }, [])

  const fetchCredential = async () => {
    setLoading(true)
    try {
      const res = await api.get('/student/credentials/transcript')
      setCredential(res.data?.data)
    } catch (err) {
      console.error('Lỗi sinh chứng thực số:', err)
      toast.error('Không thể tạo bảng điểm số xác thực: ' + (err.response?.data?.message || err.message), 'Lỗi chứng chỉ số')
    } finally {
      setLoading(false)
    }
  }

  // Đảm bảo đường dẫn đối soát luôn dùng origin thực tế của trình duyệt, không bao giờ bị dính hardcode localhost
  const getVerificationUrl = (cred) => {
    if (!cred) return ''
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''
    return `${origin}/verify/transcript?serial=${encodeURIComponent(cred.serial)}&sig=${encodeURIComponent(cred.signature)}`
  }

  const verificationUrl = getVerificationUrl(credential)

  const copyLink = () => {
    if (verificationUrl) {
      navigator.clipboard.writeText(verificationUrl)
      setCopiedLink(true)
      toast.success('Đã sao chép đường dẫn đối soát bảng điểm số vào bộ nhớ tạm!', 'Thành công')
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-red-800 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Bảng Điểm Số Xác Thực Mật Mã
                <span className="text-[10px] bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Tamper-Proof
                </span>
              </h2>
              <p className="text-xs text-rose-100 font-medium">
                Chứng chỉ học vụ số hóa với chữ ký điện tử HMAC-SHA256 & QR đối soát chống giả mạo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-red-700 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Đang sinh chữ ký số mật mã cho hồ sơ học tập...</p>
            </div>
          ) : credential ? (
            <div className="space-y-6">
              
              {/* Digital Certificate Card */}
              <div className="relative p-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/50 via-white to-amber-50/30 shadow-sm space-y-4">
                
                {/* Certificate Brand Header */}
                <div className="flex items-start justify-between border-b border-amber-200 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-red-800 tracking-wider uppercase block">
                      Học Viện Công Nghệ Rikkei • Rikkei Academy of Technology
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      GIẤY CHỨNG NHẬN KẾT QUẢ HỌC TẬP SỐ
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 font-mono mt-0.5">
                      Mã Serial: <strong className="text-slate-900">{credential.serial}</strong>
                    </p>
                  </div>

                  <span className="px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={15} className="text-emerald-700" />
                    ĐÃ BẢO CHỨNG
                  </span>
                </div>

                {/* Main Dossier Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center">
                  
                  {/* Student Details (2 Cols) */}
                  <div className="sm:col-span-2 space-y-3 text-xs">
                    <div>
                      <span className="text-slate-600 font-medium block">Họ và tên sinh viên:</span>
                      <span className="font-extrabold text-slate-900 text-base">{credential.fullName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-slate-600 font-medium block">Mã số sinh viên (MSSV):</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{credential.studentCode}</span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium block">Chuyên ngành đào tạo:</span>
                        <span className="font-bold text-slate-900 text-xs">{credential.major}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-100">
                      <div>
                        <span className="text-slate-600 font-medium block">Điểm CGPA tích lũy:</span>
                        <span className="font-mono font-black text-red-700 text-lg">{credential.cgpa} <span className="text-xs font-normal text-slate-500">/ 10.0</span></span>
                      </div>
                      <div>
                        <span className="text-slate-600 font-medium block">Tín chỉ tích lũy:</span>
                        <span className="font-mono font-bold text-slate-900 text-sm">{credential.creditsEarned} / {credential.totalRequiredCredits} TC</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-slate-600 font-medium">Xếp loại học vụ:</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 font-extrabold text-xs">
                        {credential.academicStanding}
                      </span>
                    </div>
                  </div>

                  {/* QR Code (1 Col) */}
                  <div className="flex flex-col items-center justify-center p-3.5 rounded-xl bg-white border border-amber-200 text-center shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationUrl)}`}
                      alt="Verifiable Transcript QR"
                      className="w-32 h-32 object-contain"
                    />
                    <span className="text-[11px] text-slate-700 font-semibold mt-2 flex items-center gap-1 justify-center">
                      <QrCode size={13} className="text-red-700" />
                      Quét mã để đối soát
                    </span>
                  </div>

                </div>

                {/* Footer of Card */}
                <div className="pt-3 border-t border-amber-200 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <span>Cơ quan cấp: <strong className="text-slate-800">Học Viện Rikkei</strong></span>
                  <span>Ngày cấp: <strong className="text-slate-800">{credential.issuedAt}</strong></span>
                </div>

              </div>

              {/* Cryptographic Signature Info */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock size={13} className="text-slate-600" />
                  Chữ ký số mật mã (HMAC-SHA256):
                </span>
                <div className="font-mono text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-300 break-all select-all font-medium leading-relaxed">
                  {credential.signature}
                </div>
              </div>

              {/* Public Verification Link */}
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <ExternalLink size={14} className="text-emerald-700" />
                    Đường dẫn đối soát công khai (Dành cho Nhà tuyển dụng / Doanh nghiệp):
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={verificationUrl}
                    className="flex-1 font-mono text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-emerald-300 outline-none select-all font-medium shadow-2xs"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={copyLink}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Đã sao chép' : 'Sao chép liên kết'}</span>
                    </button>
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                    >
                      <span>Mở đối soát</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  )
}

export default VerifiableTranscriptModal
