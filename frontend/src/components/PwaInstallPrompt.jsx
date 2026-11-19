import React, { useState, useEffect, useCallback } from 'react'
import {
  Smartphone,
  Share2,
  PlusSquare,
  X,
  WifiOff,
  Wifi,
  Sparkles,
  RefreshCw,
  Download,
  Info
} from 'lucide-react'
import { isStandalone } from '../pwaRegistration'

const DISMISS_KEY = 'eduportal_pwa_dismissed_until'
// Dismissal suppression period: 3 days (in milliseconds)
const DISMISS_DURATION_MS = 3 * 24 * 60 * 60 * 1000

const APK_DOWNLOAD_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANDROID_APK_URL) || '/downloads/RikkeiEduPortal.apk'

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)
  const [isAndroidDevice, setIsAndroidDevice] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [showAndroidModal, setShowAndroidModal] = useState(false)
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [showOnlineToast, setShowOnlineToast] = useState(false)
  const [swUpdateDetails, setSwUpdateDetails] = useState(null)
  const [dismissed, setDismissed] = useState(true)

  // Verify whether the prompt was recently dismissed by the user
  const isDismissedRecently = useCallback(() => {
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY)
      if (!dismissedUntil) return false
      return Date.now() < parseInt(dismissedUntil, 10)
    } catch {
      return false
    }
  }, [])

  // Detect iOS Safari environment
  const detectIosSafari = useCallback(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent.toLowerCase()
    const isIos =
      (/iphone|ipad|ipod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !window.MSStream

    const isSafari =
      ua.includes('safari') &&
      !ua.includes('crios') &&
      !ua.includes('fxios') &&
      !ua.includes('edgios') &&
      !ua.includes('opios')

    return isIos && isSafari
  }, [])

  // Detect Android environment
  const detectAndroid = useCallback(() => {
    if (typeof window === 'undefined') return false
    const ua = window.navigator.userAgent.toLowerCase()
    return /android/.test(ua)
  }, [])

  useEffect(() => {
    // If application is already running in standalone PWA mode, never prompt for installation
    if (isStandalone()) {
      return
    }

    const ios = detectIosSafari()
    const android = detectAndroid()
    setIsIosDevice(ios)
    setIsAndroidDevice(android)

    // Check if dismissed before deciding to reveal prompt
    if (!isDismissedRecently()) {
      // Short delay so banner appears non-intrusively after initial render
      const timer = setTimeout(() => {
        setDismissed(false)
        if (ios || android) {
          setIsInstallable(true)
        }
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [detectIosSafari, detectAndroid, isDismissedRecently])

  useEffect(() => {
    // 1. Android Chrome / Chromium native install prompt listener
    const handleBeforeInstallPrompt = (e) => {
      // Prevent browser default mini-infobar on mobile
      e.preventDefault()
      setDeferredPrompt(e)
      if (!isStandalone() && !isDismissedRecently()) {
        setIsInstallable(true)
        setDismissed(false)
      }
    }

    // 2. Application installed listener
    const handleAppInstalled = () => {
      console.log('[PWA] Application successfully installed.')
      try {
        localStorage.setItem('eduportal_pwa_installed', 'true')
      } catch {}
      setIsInstallable(false)
      setDeferredPrompt(null)
      setShowIosGuide(false)
    }

    // 3. Online/Offline network state listeners
    const handleOnline = () => {
      setIsOffline(false)
      setShowOnlineToast(true)
      const toastTimer = setTimeout(() => setShowOnlineToast(false), 3500)
      return () => clearTimeout(toastTimer)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowOnlineToast(false)
    }

    // 4. Service Worker update event listener
    const handleSwUpdated = (e) => {
      if (e.detail) {
        setSwUpdateDetails(e.detail)
      }
    }

    // 5. Open install/download prompt on demand from any component (Sidebar, Header, etc.)
    const handleOpenInstallPrompt = () => {
      setDismissed(false)
      const android = detectAndroid()
      const ios = detectIosSafari()
      if (android) {
        setShowAndroidModal(true)
      } else if (ios) {
        setShowIosGuide(true)
      } else {
        setShowAndroidModal(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('eduportal:sw-updated', handleSwUpdated)
    window.addEventListener('eduportal:open-install-prompt', handleOpenInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('eduportal:sw-updated', handleSwUpdated)
      window.removeEventListener('eduportal:open-install-prompt', handleOpenInstallPrompt)
    }
  }, [detectAndroid, detectIosSafari, isDismissedRecently])

  // Handle direct Android APK download trigger
  const handleAndroidApkDownload = useCallback(() => {
    setShowAndroidModal(true)
    try {
      const link = document.createElement('a')
      link.href = APK_DOWNLOAD_URL
      link.setAttribute('download', 'RikkeiEduPortal.apk')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.warn('[PWA] Failed to auto-trigger APK download:', err)
    }
  }, [])

  // Handle Android Install button click
  const handleAndroidInstall = async () => {
    if (!deferredPrompt) {
      if (isIosDevice) {
        setShowIosGuide(true)
      }
      return
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        try {
          localStorage.setItem('eduportal_pwa_installed', 'true')
        } catch {}
        setIsInstallable(false)
      }
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err)
    } finally {
      setDeferredPrompt(null)
    }
  }

  // Handle user dismissal ("Để sau")
  const handleDismiss = () => {
    setDismissed(true)
    setShowIosGuide(false)
    setShowAndroidModal(false)
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION_MS))
    } catch {}
  }

  // Handle Service Worker update reload
  const handleApplyUpdate = () => {
    if (swUpdateDetails && typeof swUpdateDetails.skipWaiting === 'function') {
      swUpdateDetails.skipWaiting()
    } else {
      window.location.reload()
    }
  }

  return (
    <>
      {/* ── 1. Offline Alert Banner ─────────────────────────────────── */}
      {isOffline && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-300"
        >
          <WifiOff size={16} className="shrink-0 animate-pulse text-amber-950" />
          <span>
            Bạn đang ở chế độ <strong>Ngoại tuyến (Offline)</strong>. Giao diện và dữ liệu tĩnh được tải từ bộ nhớ đệm PWA.
          </span>
        </aside>
      )}

      {/* ── 2. Reconnected Toast Notification ───────────────────────── */}
      {showOnlineToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-3 right-4 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <Wifi size={16} className="shrink-0 text-emerald-200" />
          <span>Đã kết nối Internet trở lại. Hệ thống hoạt động bình thường!</span>
        </aside>
      )}

      {/* ── 3. Service Worker Version Update Pill ───────────────────── */}
      {swUpdateDetails && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] sm:w-auto bg-slate-900/95 backdrop-blur-md text-white border border-slate-700 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-medium">Đã có bản cập nhật mới của EduPortal!</span>
          </div>
          <button
            onClick={handleApplyUpdate}
            className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition text-xs shrink-0 cursor-pointer shadow-sm"
          >
            <RefreshCw size={12} className="animate-spin-slow" />
            Cập nhật ngay
          </button>
        </aside>
      )}

      {/* ── 4. Floating Mobile-First PWA Install Banner ─────────────── */}
      {isInstallable && !dismissed && (
        <aside
          role="dialog"
          aria-labelledby="pwa-prompt-title"
          aria-describedby="pwa-prompt-desc"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-5 duration-300"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
        >
          <div className="flex items-start gap-3.5">
            {/* App Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white flex items-center justify-center shrink-0 shadow-md border border-red-500/30 overflow-hidden">
              <img
                src="/images/icon-192x192.png"
                alt="EduPortal App Icon"
                className="w-10 h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <Smartphone size={22} className="fallback-icon" />
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400">
                  <Sparkles size={10} className="mr-0.5" /> {isAndroidDevice ? 'Android APK' : 'PWA'}
                </span>
                <h4 id="pwa-prompt-title" className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {isAndroidDevice ? 'Cài đặt EduPortal trên Android' : 'Trải nghiệm EduPortal tốt hơn'}
                </h4>
              </div>
              <p id="pwa-prompt-desc" className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {isAndroidDevice
                  ? 'Tải tệp APK để cài đặt trực tiếp ứng dụng hoặc thêm vào màn hình chính.'
                  : 'Cài đặt ứng dụng để truy cập nhanh và sử dụng thuận tiện trên điện thoại.'}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {isIosDevice ? (
                  <button
                    onClick={() => setShowIosGuide(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Info size={13} />
                    Hướng dẫn cài đặt
                  </button>
                ) : isAndroidDevice ? (
                  <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                    <button
                      onClick={handleAndroidApkDownload}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Download size={13} />
                      Tải file APK
                    </button>
                    {deferredPrompt && (
                      <button
                        onClick={handleAndroidInstall}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                        title="Hoặc thêm nhanh vào màn hình chính (PWA)"
                      >
                        <Sparkles size={11} className="text-red-600" />
                        PWA
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleAndroidInstall}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Download size={13} />
                    Cài đặt ngay
                  </button>
                )}

                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            </div>

            {/* Dismiss Cross Button */}
            <button
              onClick={handleDismiss}
              aria-label="Đóng thông báo cài đặt"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 -mr-1 -mt-1 rounded-lg transition"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      {/* ── 5. iOS Safari Step-by-Step Installation Modal ───────────── */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-guide-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 id="ios-guide-title" className="text-sm font-bold text-slate-900 dark:text-white">
                    Cài đặt EduPortal trên iOS
                  </h3>
                  <p className="text-[11px] text-slate-500">Thao tác qua Safari trên iPhone / iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                aria-label="Đóng hướng dẫn"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-5 space-y-4">
              {/* Step 1 */}
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span>Nhấn vào biểu tượng </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 mx-1">
                    <Share2 size={13} className="mr-1 text-blue-600" /> Chia sẻ (Share)
                  </span>
                  <span>ở thanh công cụ phía dưới cùng của trình duyệt Safari.</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span>Cuộn xuống trong danh sách tùy chọn và nhấn chọn </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-900 dark:text-slate-100 mx-1">
                    <PlusSquare size={13} className="mr-1 text-slate-700 dark:text-slate-200" /> Thêm vào MH chính (Add to Home Screen)
                  </span>
                  <span>.</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  <span>Nhấn nút </span>
                  <strong className="text-red-700 dark:text-red-400 font-bold">"Thêm" (Add)</strong>
                  <span> ở góc trên bên phải màn hình để hoàn tất đưa ứng dụng ra màn hình chính.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowIosGuide(false)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer text-center"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Android APK Step-by-Step Download Modal ─────────────── */}
      {showAndroidModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="android-modal-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-300"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 id="android-modal-title" className="text-sm font-bold text-slate-900 dark:text-white">
                    Tải Ứng Dụng Rikkei EduPortal (Android)
                  </h3>
                  <p className="text-[11px] text-slate-500">Tệp APK cài đặt trực tiếp cho điện thoại Android</p>
                </div>
              </div>
              <button
                onClick={() => setShowAndroidModal(false)}
                aria-label="Đóng hướng dẫn tải APK"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* APK Download Card */}
            <div className="mt-4 p-4 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>RikkeiEduPortal.apk</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 font-bold">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Tương thích Android 8.0+ • ~35 MB
                  </p>
                </div>
                <a
                  href={APK_DOWNLOAD_URL}
                  download="RikkeiEduPortal.apk"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition shrink-0 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Tải APK</span>
                </a>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="mt-5 space-y-3.5">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Hướng dẫn cài đặt file APK trên Android:
              </h4>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Nhấn "Tải APK" để tải tệp về máy
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tệp <code>RikkeiEduPortal.apk</code> sẽ được lưu vào thư mục Tải về (Downloads).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Mở tệp và cho phép cài đặt
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Nhấn vào tệp vừa tải. Nếu Android cảnh báo <em>"Cài đặt ứng dụng không rõ nguồn"</em>, hãy chọn <strong>Cài đặt &gt; Bật Cho phép từ nguồn này</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white">
                    Nhấn Cài đặt (Install)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Quá trình cài đặt mất khoảng 5 - 10 giây. Sau khi xong, mở ứng dụng và đăng nhập bình thường!
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Alternative: PWA option */}
            {deferredPrompt && (
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Hoặc không muốn tải tệp?
                </span>
                <button
                  onClick={() => {
                    setShowAndroidModal(false)
                    handleAndroidInstall()
                  }}
                  className="font-bold text-red-600 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles size={12} />
                  Cài nhanh qua trình duyệt (PWA)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
