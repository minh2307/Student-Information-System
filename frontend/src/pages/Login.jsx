import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { confirmDialog } from '../store/confirmStore'
import api from '../services/api'
import { 
  Lock, 
  User, 
  GraduationCap, 
  ShieldAlert, 
  AlertCircle,
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
  Clock,
  Sparkles,
  Info
} from 'lucide-react'

const CATEGORIES = ['Tất cả', 'HỌC VỤ', 'LỊCH THI', 'HỌC BỔNG', 'HOẠT ĐỘNG']

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Kế hoạch đăng ký học phần & mở cổng tín chỉ Học kỳ II (2024 - 2025)',
    content: 'Phòng Quản lý Đào tạo thông báo kế hoạch đăng ký học phần cho sinh viên toàn học viện. Sinh viên kiểm tra học phần tiên quyết, hạn mức tín chỉ (12 - 24 TC) và thực hiện đăng ký đúng hạn.',
    category: 'HỌC VỤ',
    author: 'Phòng Quản lý Đào tạo',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isPinned: true
  },
  {
    id: 2,
    title: 'Lịch thi kết thúc học phần & tra cứu số báo danh, phòng thi chính thức',
    content: 'Hội đồng Khảo thí & ĐBCL thông báo lịch thi đợt 1. Sinh viên có mặt trước ca thi 15 phút, xuất trình Thẻ sinh viên điện tử có gắn chip / QR để giám thị đối soát.',
    category: 'LỊCH THI',
    author: 'Hội đồng Khảo thí',
    createdAt: new Date(Date.now() - 3600000 * 36).toISOString(),
    isPinned: false
  },
  {
    id: 3,
    title: 'Quyết định xét cấp học bổng khuyến khích học tập & tài năng công nghệ',
    content: 'Công bố danh sách sinh viên đạt thành tích Xuất sắc và Giỏi học kỳ vừa qua. Sinh viên đối soát thông tin tài khoản ngân hàng để phòng Kế hoạch - Tài chính giải ngân học bổng.',
    category: 'HỌC BỔNG',
    author: 'Phòng Công tác Sinh viên',
    createdAt: new Date(Date.now() - 3600000 * 60).toISOString(),
    isPinned: false
  }
]

export const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileContainerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAF67h8UHE6evHONq'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  useEffect(() => {
    let intervalId = null
    const initTurnstile = () => {
      if (window.turnstile && turnstileContainerRef.current && widgetIdRef.current === null) {
        try {
          widgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: siteKey,
            action: 'login',
            callback: (token) => {
              setTurnstileToken(token)
            },
            'expired-callback': () => {
              setTurnstileToken('')
            },
            'error-callback': () => {
              setTurnstileToken('')
            }
          })
          if (intervalId) clearInterval(intervalId)
        } catch (err) {
          console.warn('Turnstile render warning:', err)
        }
      }
    }

    if (window.turnstile) {
      initTurnstile()
    } else {
      intervalId = setInterval(initTurnstile, 200)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {}
        widgetIdRef.current = null
      }
    }
  }, [siteKey])

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
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setAnnouncements(res.data.data)
        } else {
          setAnnouncements(DEFAULT_ANNOUNCEMENTS)
        }
      } catch (err) {
        console.warn('Chưa tải được bảng tin từ server, dùng seed data:', err.message)
        setAnnouncements(DEFAULT_ANNOUNCEMENTS)
      } finally {
        setLoadingAnnouncements(false)
      }
    }
    fetchAnnouncements()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setUsernameError('')
    setPasswordError('')

    let hasError = false
    if (!username.trim()) {
      setUsernameError('Vui lòng nhập tên đăng nhập hoặc mã SV / mã GV.')
      hasError = true
    }
    if (!password.trim()) {
      setPasswordError('Vui lòng nhập mật khẩu bảo mật.')
      hasError = true
    }
    if (hasError) {
      return
    }

    setLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const token = turnstileToken || formData.get('cf-turnstile-response') || ''

    try {
      const res = await api.post('/auth/login', {
        username,
        password,
        'cf-turnstile-response': token,
        turnstileToken: token
      })
      const { user, accessToken, refreshToken } = res.data.data
      login(user, accessToken, refreshToken)

      if (user.role === 'ADMIN') navigate('/admin/users')
      else if (user.role === 'LECTURER') navigate('/lecturer/classes')
      else navigate('/student/dashboard')
    } catch (err) {
      console.warn('API error, fallback demo mode:', err)
      const msg = err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu!'
      setError(msg)
      if (window.turnstile && widgetIdRef.current !== null) {
        try {
          window.turnstile.reset(widgetIdRef.current)
          setTurnstileToken('')
        } catch (e) {}
      }
    } finally {
      setLoading(false)
    }
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
        return 'bg-red-50 text-red-700 border-red-200'
      case 'LỊCH THI':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'HỌC BỔNG':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'HOẠT ĐỘNG':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      default:
        return 'bg-stone-50 text-stone-600 border-stone-200'
    }
  }

  return (
    <div 
      className="min-h-screen flex flex-col font-sans text-stone-800 relative bg-stone-100 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(to right, rgba(250, 250, 249, 0.90) 0%, rgba(250, 250, 249, 0.82) 50%, rgba(250, 250, 249, 0.90) 100%), url('/images/login-banner.png')`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* 1. Official Portal Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/images/logo.png" 
              alt="Rikkei Logo" 
              className="h-9 w-auto object-contain max-w-[130px]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/logo.svg';
              }}
            />
            <div className="border-l border-stone-200 pl-3">
              <h1 className="font-bold text-sm sm:text-base text-stone-900 leading-tight uppercase tracking-tight">
                HỌC VIỆN CÔNG NGHỆ RIKKEI
              </h1>
              <p className="text-[10px] text-red-700 font-mono font-semibold tracking-wide uppercase">
                CỔNG THÔNG TIN ĐÀO TẠO & HỌC VỤ ĐIỆN TỬ
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-5 text-xs text-stone-600">
            <span className="flex items-center gap-1.5">
              <Phone size={13} className="text-red-700" />
              <span>Hotline: <strong className="text-stone-900 font-mono">(024) 7300 6886</strong></span>
            </span>
            <span className="flex items-center gap-1.5">
              <Mail size={13} className="text-red-700" />
              <span>Email: <strong className="text-stone-900 font-mono">daotao@rikkei.edu.vn</strong></span>
            </span>
            <span className="font-mono text-stone-700 bg-stone-100 px-2.5 py-0.5 rounded border border-stone-200 text-[11px] font-semibold">
              Học kỳ 2024 - 2025
            </span>
          </div>
        </div>
      </header>

      {/* 2. Main Body: Priority Login Form (Top on Mobile / Primary on Desktop) + Compact Announcements */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ── SECTION 1: MODAL ĐĂNG NHẬP HIỆN LÊN TRÊN (5 Cols trên Desktop, Ưu tiên số 1 trên Mobile) ── */}
          <div className="order-1 lg:order-1 lg:col-span-5 w-full">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/90 overflow-hidden transition-all duration-300">
              
              {/* Header của Khung Đăng Nhập */}
              <div className="bg-gradient-to-r from-red-800 via-red-900 to-red-950 p-5 sm:p-6 text-white text-center border-b border-red-950 relative overflow-hidden">
                <div 
                  className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                  style={{ backgroundImage: `url('/images/login-banner.png')` }}
                />
                <div className="relative z-10">
                  <div className="inline-flex p-2.5 rounded-xl bg-white/10 mb-2 border border-white/20 shadow-xs backdrop-blur-xs">
                    <GraduationCap size={26} className="text-white" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight">Đăng Nhập Cổng Đào Tạo</h2>
                  <p className="text-xs text-red-100 font-medium mt-0.5">
                    Xác thực tài khoản Sinh viên, Giảng viên & Quản trị
                  </p>
                </div>
              </div>

              {/* Form Đăng Nhập */}
              <form onSubmit={handleLogin} className="p-5 sm:p-6 space-y-4">
                {error && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2.5 animate-in fade-in">
                    <ShieldAlert size={16} className="shrink-0 text-red-700 mt-0.5" />
                    <span className="font-medium leading-relaxed">{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1.5 uppercase">
                    Tên đăng nhập / Mã SV / Mã GV
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <User size={15} />
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        if (usernameError) setUsernameError('')
                      }}
                      placeholder="sv2024001, gv001, admin..."
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs font-mono focus:outline-none focus:bg-white transition-all ${
                        usernameError 
                          ? 'border-red-600 focus:border-red-700 ring-2 ring-red-500/20' 
                          : 'border-stone-200 focus:border-red-700 focus:ring-2 focus:ring-red-700/10'
                      }`}
                    />
                  </div>
                  {usernameError && (
                    <p className="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0 text-red-600" />
                      <span>{usernameError}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-mono font-bold text-stone-700 mb-1.5 uppercase">
                    Mật khẩu bảo mật
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock size={15} />
                    </span>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (passwordError) setPasswordError('')
                      }}
                      placeholder="••••••••"
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-stone-50 border rounded-xl text-xs focus:outline-none focus:bg-white transition-all ${
                        passwordError 
                          ? 'border-red-600 focus:border-red-700 ring-2 ring-red-500/20' 
                          : 'border-stone-200 focus:border-red-700 focus:ring-2 focus:ring-red-700/10'
                      }`}
                    />
                  </div>
                  {passwordError && (
                    <p className="mt-1.5 text-[11px] text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle size={12} className="shrink-0 text-red-600" />
                      <span>{passwordError}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-stone-600 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="rounded border-stone-300 text-red-700 focus:ring-red-700" />
                    <span className="text-[11px] font-medium">Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      confirmDialog({
                        title: 'Khôi Phục Mật Khẩu Truy Cập',
                        message: 'Vui lòng liên hệ trực tiếp Văn phòng Đào tạo (Email: daotao@rikkei.edu.vn | Hotline: (024) 7300 6886) và cung cấp Thẻ sinh viên hoặc CCCD để được cấp lại mật khẩu xác thực.',
                        confirmText: 'Đã hiểu',
                        cancelText: 'Đóng',
                        variant: 'info'
                      });
                    }}
                    className="text-[11px] text-red-700 hover:text-red-900 font-semibold transition-colors"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                {/* Cloudflare Turnstile Verification Widget */}
                <div className="flex justify-center my-2">
                  <div
                    ref={turnstileContainerRef}
                    className="cf-turnstile"
                    data-sitekey={siteKey}
                    data-action="login"
                  ></div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-3 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2 cursor-pointer"
                >
                  <span>{loading ? 'Đang xác thực hệ thống...' : 'Đăng Nhập Ngay'}</span>
                  <ArrowRight size={16} />
                </button>

                <div className="pt-2 text-center border-t border-stone-100 mt-3">
                  <p className="text-[10px] font-mono text-stone-500 flex items-center justify-center gap-1.5 font-medium">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    Bảo mật chuẩn JWT SSO 256-bit • Mã hóa kết nối SSL
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* ── SECTION 2: BẢNG TIN THÔNG BÁO TINH GỌN (THÔNG BÁO NHỎ LẠI) - 7 Cols trên Desktop, Thứ 2 trên Mobile ── */}
          <div className="order-2 lg:order-2 lg:col-span-7 w-full space-y-4">
            
            {/* Thanh Tiêu Đề Bảng Tin Tinh Gọn & Tìm Kiếm */}
            <div className="bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center justify-center shrink-0">
                    <Bell size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
                        Thông Báo & Công Văn Học Viện
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded-full">
                        {filteredList.length} tin
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Phòng Quản lý Đào tạo & Khảo thí ban hành
                    </p>
                  </div>
                </div>

                {/* Tra cứu công văn nhỏ gọn */}
                <div className="relative w-full sm:w-56">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm công văn..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:border-red-700 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Category Filter Tabs - Mini Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-3 mt-3 border-t border-stone-100">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-stone-900 text-white font-semibold shadow-2xs'
                        : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Danh sách thông báo dạng Compact Rows (Không chiếm nhiều diện tích) */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl border border-stone-200/90 shadow-2xs p-3 sm:p-4">
              {loadingAnnouncements ? (
                <div className="py-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2 text-xs text-stone-500">Đang cập nhật công văn...</p>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-500">
                  Không tìm thấy thông báo nào trong danh mục này.
                </div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5">
                  {filteredList.map((item) => {
                    const itemDate = new Date(item.createdAt)
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedArticle(item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-start gap-3 hover:border-red-300 hover:bg-stone-50/70 ${
                          item.isPinned ? 'border-red-200/90 bg-red-50/20' : 'border-stone-200/70 bg-white'
                        }`}
                      >
                        {/* Mini Date Badge */}
                        <div className="w-11 h-11 rounded-lg bg-stone-50 border border-stone-200 flex flex-col items-center justify-center shrink-0 group-hover:border-red-300 transition-colors">
                          <span className="text-[9px] font-mono font-bold text-red-700 leading-none">
                            T{itemDate.getMonth() + 1}
                          </span>
                          <span className="text-sm font-mono font-bold text-stone-900 leading-tight">
                            {itemDate.getDate()}
                          </span>
                        </div>

                        {/* Title & Metadata */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${getCategoryBadge(item.category)}`}>
                              {item.category}
                            </span>
                            {item.isPinned && (
                              <span className="flex items-center gap-0.5 text-[9px] font-mono font-bold text-red-800 bg-red-100 px-1.5 py-0.2 rounded border border-red-200">
                                <Pin size={8} className="fill-red-700" />
                                KHẨN
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-stone-600 ml-auto hidden sm:inline">
                              Số: {100 + Number(item.id)}/TB-ĐT
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 group-hover:text-red-800 transition-colors line-clamp-1">
                            {item.title}
                          </h4>

                          <p className="text-[11px] text-stone-600 mt-0.5 line-clamp-1 leading-normal">
                            {item.content}
                          </p>

                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-600">
                            <span>{item.author || 'Phòng Đào tạo'}</span>
                            <span className="text-red-700 group-hover:text-red-900 font-semibold flex items-center gap-0.5">
                              Xem chi tiết <ChevronRight size={11} />
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Văn bản Quy định Nhanh dạng Chips Gọn Gàng */}
            <div className="bg-white/80 p-3 sm:p-3.5 rounded-xl border border-stone-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800 mb-2 font-mono uppercase">
                <BookOpen size={13} className="text-red-700" />
                <span>Quy Chế Học Vụ & Khảo Thí</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedArticle({
                    id: 'reg-dk',
                    category: 'HỌC VỤ',
                    title: 'Quy Chế Đăng Ký Học Phần & Tín Chỉ Đại Học',
                    author: 'Phòng Đào tạo',
                    createdAt: new Date().toISOString(),
                    content: `1. THỜI GIAN ĐĂNG KÝ:\nCổng tín chỉ mở theo từng đợt công bố của kỳ học. Sinh viên hoàn thành đăng ký và kiểm tra trước khi kết thúc đợt.\n\n2. HẠN MỨC TÍN CHỈ:\nTối thiểu 12 tín chỉ, tối đa 24 tín chỉ cho mỗi học kỳ chính (trừ học kỳ hè hoặc đồ án tốt nghiệp).\n\n3. HỌC PHẦN TIÊN QUYẾT:\nSinh viên phải tích lũy đạt điểm điều kiện các môn tiên quyết trước khi đăng ký học phần tiếp theo.\n\n4. HỦY / ĐỔI LỚP:\nTrong thời gian điều chỉnh, sinh viên có thể hủy hoặc chuyển đổi lớp nếu còn chỉ tiêu.`
                  })}
                  className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-red-800 font-medium text-[11px] transition flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="truncate">1. Quy chế đăng ký môn</span>
                  <ExternalLink size={11} className="shrink-0 text-stone-600 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedArticle({
                    id: 'reg-hp',
                    category: 'HỌC VỤ',
                    title: 'Quy Định Định Mức & Quyết Toán Học Phí',
                    author: 'Phòng Kế hoạch - Tài chính',
                    createdAt: new Date().toISOString(),
                    content: `1. ĐỊNH MỨC HỌC PHÍ:\nĐơn giá chuẩn 450.000 VNĐ / 1 tín chỉ quy đổi cho các học phần đại trà.\n\n2. PHƯƠNG THỨC THANH TOÁN:\nSinh viên thanh toán trực tuyến qua mã QR VietQR động tích hợp trên cổng hoặc chuyển khoản đúng cú pháp qua tài khoản ngân hàng nhà trường.\n\n3. THỜI HẠN QUYẾT TOÁN:\nHạn chót đóng học phí là 30 ngày kể từ ngày chốt thời hạn đăng ký học phần.\n\n4. XỬ LÝ QUÁ HẠN:\nSinh viên chưa hoàn thành học phí đúng hạn sẽ bị tạm khóa kết quả thi và quyền đăng ký môn kỳ kế tiếp.`
                  })}
                  className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-red-800 font-medium text-[11px] transition flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="truncate">2. Định mức học phí & QR</span>
                  <ExternalLink size={11} className="shrink-0 text-stone-600 ml-1" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedArticle({
                    id: 'reg-thi',
                    category: 'LỊCH THI',
                    title: 'Nội Quy & Kỷ Luật Phòng Thi Học Kỳ',
                    author: 'Hội đồng Khảo thí & ĐBCL',
                    createdAt: new Date().toISOString(),
                    content: `1. GIẤY TỜ BẮT BUỘC:\nXuất trình Thẻ sinh viên hoặc CCCD có gắn chip khi vào phòng thi.\n\n2. THỜI GIAN CÓ MẶT:\nCó mặt tại phòng thi trước giờ phát đề tối thiểu 15 phút. Sinh viên muộn quá 15 phút sau phát đề sẽ không được tham dự.\n\n3. THIẾT BỊ CẤM:\nNghiêm cấm mang điện thoại thông minh, đồng hồ thông minh, tài liệu vào phòng thi dưới mọi hình thức.\n\n4. KỶ LUẬT VI PHẠM:\nMọi hành vi gian lận sẽ bị lập biên bản, đình chỉ thi và nhận điểm F học phần.`
                  })}
                  className="p-2 rounded-lg bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-700 hover:text-red-800 font-medium text-[11px] transition flex items-center justify-between text-left cursor-pointer"
                >
                  <span className="truncate">3. Kỷ luật & nội quy phòng thi</span>
                  <ExternalLink size={11} className="shrink-0 text-stone-600 ml-1" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* 3. Footer */}
      <footer className="bg-white/95 backdrop-blur-md border-t border-stone-200/90 py-3.5 text-center text-xs text-stone-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[11px]">© 2026 Học viện Công nghệ Rikkei. Rikkei EduPortal v1.2</span>
          <span className="text-[11px]">Bản quyền thuộc về Phòng Quản lý Đào tạo & Khảo thí</span>
        </div>
      </footer>

      {/* Article Detail Popup Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${getCategoryBadge(selectedArticle.category)}`}>
                  {selectedArticle.category}
                </span>
                {selectedArticle.isPinned && (
                  <span className="text-xs font-mono font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded flex items-center gap-1 border border-red-200">
                    <Pin size={11} className="fill-red-700" /> Công văn khẩn
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-stone-400 hover:text-stone-600 text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto mt-4 pr-1 space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-stone-900 leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="flex items-center gap-4 text-xs text-stone-500 border-b border-stone-100 pb-3 font-mono">
                <span>Ban hành: <strong className="text-stone-800">{selectedArticle.author || 'Phòng Đào tạo'}</strong></span>
                <span>•</span>
                <span>Ngày: <strong className="text-stone-800">{new Date(selectedArticle.createdAt).toLocaleString('vi-VN')}</strong></span>
              </div>

              <div className="text-xs sm:text-sm text-stone-700 whitespace-pre-wrap leading-relaxed space-y-3 font-sans">
                {selectedArticle.content}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition cursor-pointer"
              >
                Đóng công văn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
