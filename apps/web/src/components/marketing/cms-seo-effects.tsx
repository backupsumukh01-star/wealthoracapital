'use client'

import { useEffect } from 'react'

import { useAdminOs } from '@/providers/admin-os-provider'

/** Applies site SEO settings (title, description, favicon, analytics IDs) client-side. */
export function CmsSeoEffects() {
  const { ready, state } = useAdminOs()
  const seo = state.siteSeo

  useEffect(() => {
    if (!ready) return
    if (seo.metaTitle) document.title = seo.metaTitle

    const ensureMeta = (name: string, content: string) => {
      if (!content) return
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.setAttribute('content', content)
    }
    ensureMeta('description', seo.metaDescription)

    if (seo.faviconUrl) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = seo.faviconUrl
    }

    if (seo.googleAnalyticsId && !document.getElementById('growzy-ga')) {
      const s = document.createElement('script')
      s.id = 'growzy-ga'
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(seo.googleAnalyticsId)}`
      document.head.appendChild(s)
      const inline = document.createElement('script')
      inline.id = 'growzy-ga-inline'
      inline.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${seo.googleAnalyticsId}');`
      document.head.appendChild(inline)
    }

    if (seo.facebookPixelId && !document.getElementById('growzy-pixel')) {
      const inline = document.createElement('script')
      inline.id = 'growzy-pixel'
      inline.text = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${seo.facebookPixelId}');fbq('track','PageView');`
      document.head.appendChild(inline)
    }
  }, [ready, seo])

  return null
}
