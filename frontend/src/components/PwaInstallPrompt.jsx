import React, { useState, useEffect } from 'react'
import { Download, WifiOff, X, Smartphone } from 'lucide-react'

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 1. Listen for PWA install eligibility
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    // 2. Listen for network connectivity status
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setIsInstallable(false)
    }
    setDeferredPrompt(null)
  }

  return (
    <>
      {/* Offline Alert Banner */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top">
          <WifiOff size={16} />
          <span>Bạn đang ở chế độ Ngoại tuyến (Offline). Dữ liệu được tải từ bộ nhớ đệm PWA.</span>
        </div>
      )}

      {/* Floating 1-Click PWA Install Prompt */}
      {isInstallable && !dismissed && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Smartphone size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Cài đặt EduPortal App</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
              Mở nhanh trên màn hình chính & xem offline
            </p>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
          >
            Cài đặt
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </>
  )
}
