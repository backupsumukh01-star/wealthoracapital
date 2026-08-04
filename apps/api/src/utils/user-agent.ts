export function parseUserAgent(userAgent: string | null | undefined): {
  device: string
  browser: string
} {
  const ua = userAgent ?? ''
  const device = /Mobile|Android|iPhone|iPad/i.test(ua)
    ? 'Mobile'
    : /Tablet/i.test(ua)
      ? 'Tablet'
      : 'Desktop'

  let browser = 'Unknown'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari'
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera'

  return { device, browser }
}
