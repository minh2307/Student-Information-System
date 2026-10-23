import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import { 
  Lock, 
  User, 
  GraduationCap, 
  ShieldAlert, 
  ArrowRight, 
  Bell, 
  Pin, 
  Calendar, 
  Search, 
  ChevronRight, 
  ExternalLink, 
  BookOpen, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Building,
  FileText,
  Clock
} from 'lucide-react'

const CATEGORIES = ['Tất cả', 'HỌC VỤ', 'LỊCH THI', 'HỌC BỔNG', 'HOẠT ĐỘNG']

export const Login = () => {
  const [username, setUsername] = useState('sv2024001')
  const [password, setPassword] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  // Announcements state
  const [announcements, setAnnouncements] = useState([])
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedArticle, setSelectedArticle] = useState(null)

  // Tải danh sách thông báo chung
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.get('/announcements')
        if (res.data?.data) {
          setAnnouncements(res.data.data)
        }
      } catch (err) {
        console.warn('Chưa tải được bảng tin từ server, dùng seed data:', err.message)
      } finally {
        setLoadingAnnouncements(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { username, password })
      const { user, accessToken } = res.data.data
      login(user, accessToken)

      if (user.role === 'ADMIN') navigate('/admin/users')
      else if (user.role === 'LECTURER') navigate('/lecturer/classes')
      else navigate('/student/dashboard')
    } catch (err) {
      console.warn('API error, fallback demo mode:', err)
      const msg = err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu!'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const fillQuickAccount = (u, p) => {
    setUsername(u)
    setPassword(p)
  }

  // Lọc thông báo
  const filteredList = useMemo(() => {
    return announcements.filter(item => {
      const matchCat = selectedCategory === 'Tất cả' || item.category === selectedCategory
      const matchKey = !searchKeyword ||
        item.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        item.content.toLowerCase().includes(searchKeyword.toLowerCase())
      return matchCat && matchKey
    })
  }, [announcements, selectedCategory, searchKeyword])

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'HỌC VỤ':
        return 'bg-red-50 text-red-800 border-red-200'
      case 'LỊCH THI':
        return 'bg-stone-100 text-stone-800 border-stone-300'
      case 'HỌC BỔNG':
        return 'bg-amber-50 text-amber-800 border-amber-200'
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-stone-800 relative bg-stone-100 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(250, 250, 249, 0.85) 0%, rgba(250, 250, 249, 0.72) 45%, rgba(250, 250, 249, 0.82) 100%), url('/images/login-banner.png')`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* 1. Official Portal Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Rikkei Logo" 
              className="h-9 w-auto object-contain max-w-[130px]"
              onError={(e) => { e.target.src = '/images/logo.svg'; }}
            />
            <div>
              <h1 className="font-serif font-bold text-sm sm:text-base text-stone-900 leading-tight uppercase tracking-tight">
                HỌC VIỆN ĐÀO TẠO RIKKEI
              </h1>
              <p className="text-[10px] text-red-700 font-mono font-medium tracking-wide uppercase">
                CỔNG THÔNG TIN ĐÀO TẠO ĐẠI HỌC (RIKKEI EDUPORTAL)
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="text-red-700" />
              <span>Hotline: <strong className="text-stone-900 font-mono">(024) 7300 6886</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} className="text-red-700" />
              <span>Email: <strong className="text-stone-900 font-mono">daotao@rikkei.edu.vn</strong></span>
            </span>
            <span className="font-mono text-stone-700 bg-stone-100/90 px-2.5 py-0.5 rounded border border-stone-200 text-[11px] font-semibold">
              Niên khóa 2024 - 2025
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Body: Left Announcements Board & Right Login Form */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* ── LEFT SECTION: University Announcements Board (60 - 65%) ── */}
          <div className="flex-1 w-full space-y-4">
            {/* Board Title Banner */}
            <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-700">
                  Phòng Quản Lý Đào Tạo & Khảo Thí
                </span>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  Bản Tin Thông Báo & Công Văn Học Viện
                </h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Cập nhật kế hoạch đào tạo, thời khóa biểu, lịch thi và quy chế học vụ
                </p>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tra cứu công văn..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                      : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Announcements List */}
            {loadingAnnouncements ? (
              <div className="bg-white rounded-2xl p-12 border border-stone-200/90 text-center">
                <div className="inline-block w-8 h-8 border-3 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-3 text-xs text-stone-600">Đang cập nhật công văn từ máy chủ đào tạo...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 border border-dashed border-stone-300 text-center">
                <p className="text-xs text-stone-600">Không tìm thấy thông báo nào trong danh mục này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedArticle(item)}
                    className={`bg-white rounded-2xl p-5 border shadow-2xs hover:border-red-300 transition-all cursor-pointer group ${
                      item.isPinned ? 'border-stone-300 bg-stone-50/40' : 'border-stone-200/90'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Block */}
                      <div className="w-14 h-14 rounded-xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center shrink-0 group-hover:border-red-300 transition-colors">
                        <span className="text-[10px] font-mono font-bold text-red-700 uppercase">
                          Tháng {new Date(item.createdAt).getMonth() + 1}
                        </span>
                        <span className="text-lg font-mono font-bold text-stone-900 leading-none">
                          {new Date(item.createdAt).getDate()}
                        </span>
                        <span className="text-[9px] font-mono text-stone-500">
                          {new Date(item.createdAt).getFullYear()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getCategoryBadge(item.category)}`}>
                            {item.category}
                          </span>
                          {item.isPinned && (
                            <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                              <Pin size={10} className="fill-stone-600" />
                              CÔNG VĂN KHẨN
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-stone-500 ml-auto hidden sm:inline">
                            Số: {100 + Number(item.id)}/TB-ĐT • {item.author || 'Phòng Đào tạo'}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-stone-900 group-hover:text-red-800 transition-colors line-clamp-2">
                          {item.title}
                        </h3>

                        <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>

                        <div className="mt-2.5 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-stone-500">
                            Ban hành lúc {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="font-semibold text-red-700 group-hover:text-red-900 flex items-center gap-0.5 text-xs">
                            Chi tiết công văn <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Regulations */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/90">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2 mb-3">
                <BookOpen size={14} className="text-red-700" />
                Văn Bản Quy Định Dành Cho Sinh Viên
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <a
                  href="#guide-dang-ky"
                  onClick={(e) => { e.preventDefault(); alert('Quy định Đăng ký tín chỉ: Mở cổng theo đợt. Tối đa 24 TC/kỳ. Sinh viên kiểm tra học phần tiên quyết trước khi đăng ký.'); }}
                  className="bg-white p-3 rounded-xl border border-stone-200 hover:border-red-300 font-medium text-stone-800 hover:text-red-800 transition flex items-center justify-between shadow-2xs"
                >
                  <span>1. Quy chế đăng ký học phần</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </a>
                <a
                  href="#guide-hoc-phi"
                  onClick={(e) => { e.preventDefault(); alert('Quy định Học phí: Đơn giá 450.000 VNĐ/tín chỉ. Quyết toán trước hạn qua VietQR hoặc tài khoản ngân hàng nhà trường.'); }}
                  className="bg-white p-3 rounded-xl border border-stone-200 hover:border-red-300 font-medium text-stone-800 hover:text-red-800 transition flex items-center justify-between shadow-2xs"
                >
                  <span>2. Định mức thu học phí</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </a>
                <a
                  href="#guide-quy-che-thi"
                  onClick={(e) => { e.preventDefault(); alert('Quy chế thi kết thúc môn: Xuất trình Thẻ sinh viên hoặc CCCD. Có mặt trước 15 phút. Không mang thiết bị thu phát sóng.'); }}
                  className="bg-white p-3 rounded-xl border border-stone-200 hover:border-red-300 font-medium text-stone-800 hover:text-red-800 transition flex items-center justify-between shadow-2xs"
                >
                  <span>3. Nội quy phòng thi học kỳ</span>
                  <ExternalLink size={12} className="text-stone-400" />
                </a>
              </div>
            </div>
          </div>

          {/* ── RIGHT SECTION: Login Card (35 - 40%) ── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 lg:sticky lg:top-24">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden">
              {/* Header of Login Card */}
              <div className="bg-gradient-to-br from-red-800 via-red-900 to-red-950 p-6 text-white text-center border-b border-red-950 relative overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/images/login-banner.png')` }}
                />
                <div className="relative z-10">
                  <div className="inline-flex p-2.5 rounded-xl bg-white/10 mb-2 border border-white/20 backdrop-blur-xs">
                    <GraduationCap size={28} className="text-white" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight">Đăng Nhập Cổng Đào Tạo</h2>
                  <p className="text-xs text-red-100 font-mono mt-0.5">
                    Xác thực danh tính học vụ điện tử
                  </p>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-center gap-2">
                    <ShieldAlert size={15} className="shrink-0 text-red-700" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1.5 uppercase">
                    Tên đăng nhập / Mã SV / Mã GV
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="sv2024001, gv001, admin..."
                      className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono focus:outline-none focus:border-red-700 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1.5 uppercase">
                    Mật khẩu bảo mật
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-1.5 text-stone-600 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded border-stone-300 text-red-700" />
                    <span className="text-[11px]">Ghi nhớ phiên</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Vui lòng liên hệ Phòng Đào tạo (daotao@rikkei.edu.vn) kèm mã sinh viên để được đặt lại mật khẩu.')}
                    className="text-[11px] text-red-700 hover:text-red-900 font-semibold"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
                >
                  <span>{loading ? 'Đang xác thực hệ thống...' : 'Đăng Nhập'}</span>
                  <ArrowRight size={15} />
                </button>

                {/* Quick Account Switcher for Testers */}
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[10px] font-mono font-bold text-stone-500 mb-2 text-center uppercase tracking-wider">
                    Chọn nhanh tài khoản kiểm thử (MK: 123456)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('sv2024001', '123456')}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        username === 'sv2024001'
                          ? 'bg-red-700 text-white border-red-700'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Sinh viên
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('gv001', '123456')}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        username === 'gv001'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Giảng viên
                    </button>
                    <button
                      type="button"
                      onClick={() => fillQuickAccount('admin', '123456')}
                      className={`px-2 py-1.5 text-xs font-semibold rounded-lg border transition ${
                        username === 'admin'
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Quản trị
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-[10px] font-mono text-stone-500 flex items-center justify-center gap-1 font-medium">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    Bảo mật chuẩn JWT SSO 256-bit
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white/90 backdrop-blur-md border-t border-stone-200/90 py-4 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[11px]">© 2026 Học viện Công nghệ Rikkei. Rikkei EduPortal v1.2</span>
          <span className="text-[11px]">Bản quyền thuộc về Phòng Quản lý Đào tạo & Khảo thí</span>
        </div>
      </footer>

      {/* Article Detail Popup Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${getCategoryBadge(selectedArticle.category)}`}>
                  {selectedArticle.category}
                </span>
                {selectedArticle.isPinned && (
                  <span className="text-xs font-mono font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded flex items-center gap-1 border border-stone-200">
                    <Pin size={11} className="fill-stone-600" /> Công văn khẩn
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto mt-4 pr-1 space-y-4">
              <h2 className="text-lg font-bold text-stone-900 leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-stone-500 border-b border-stone-100 pb-3 font-mono">
                <span>Ban hành: <strong className="text-stone-800">{selectedArticle.author || 'Phòng Đào tạo'}</strong></span>
                <span>•</span>
                <span>Ngày: <strong className="text-stone-800">{new Date(selectedArticle.createdAt).toLocaleString('vi-VN')}</strong></span>
              </div>

              <div className="text-xs text-stone-700 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {selectedArticle.content}
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
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

export default Login
