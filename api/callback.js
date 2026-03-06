import axios from 'axios'
import jwt from 'jsonwebtoken'
import { serialize, parse } from 'cookie'

const COOKIE_NAME    = 'whop_session'
const MAX_AGE        = 60 * 60 * 24 * 7  // 7 days
const JWT_SECRET     = process.env.JWT_SECRET
const CLIENT_ID      = process.env.WHOP_CLIENT_ID
const CLIENT_SECRET  = process.env.WHOP_CLIENT_SECRET
const COMPANY_KEY    = process.env.WHOP_COMPANY_KEY
const REDIRECT_URI   = 'https://stat-prophet.vercel.app/api/callback'
const PRODUCT_IDS    = new Set([
  'prod_sjZuDJVjBjx67',
  'prod_M1dvuYwoKXS3p',
  'prod_XQt15k4DIescc',
])

async function exchangeCode(code, codeVerifier) {
  const res = await axios.post('https://api.whop.com/oauth/token', {
    grant_type:    'authorization_code',
    code,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  REDIRECT_URI,
    code_verifier: codeVerifier,
  })
  return res.data
}

async function getUserId(accessToken) {
  const res = await axios.get('https://api.whop.com/oauth/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return res.data?.sub
}

async function checkMembership(userId) {
  const res = await axios.get('https://api.whop.com/api/v1/memberships', {
    headers: { Authorization: `Bearer ${COMPANY_KEY}` },
    params: { user_ids: userId, valid: true },
  })
  const memberships = res.data?.data || []
  return memberships.some(m => PRODUCT_IDS.has(m.product?.id))
}

export default async function handler(req, res) {
  const { code, error } = req.query || {}

  if (error) {
    const { error_description } = req.query || {}
    return res.redirect(`/login?error=whop_denied&detail=${encodeURIComponent(error_description || error)}`)
  }

  if (!code) {
    return res.redirect(`/login?error=no_code`)
  }

  // Retrieve PKCE code_verifier from cookie
  const cookies      = parse(req.headers.cookie || '')
  const codeVerifier = cookies['whop_cv']
  if (!codeVerifier) {
    return res.redirect(`/login?error=token_exchange&detail=missing_code_verifier`)
  }

  let tokens
  try {
    tokens = await exchangeCode(code, codeVerifier)
  } catch (err) {
    const detail = err?.response?.data
      ? JSON.stringify(err.response.data).slice(0, 120)
      : err.message?.slice(0, 120)
    console.error('Token exchange failed:', detail)
    return res.redirect(`/login?error=token_exchange&detail=${encodeURIComponent(detail)}`)
  }

  const { access_token, refresh_token, expires_in = 3600 } = tokens

  let hasAccess
  try {
    const userId = await getUserId(access_token)
    if (!userId) throw new Error('no user id from userinfo')
    hasAccess = await checkMembership(userId)
  } catch (err) {
    const detail = err?.response?.data
      ? JSON.stringify(err.response.data).slice(0, 200)
      : err.message?.slice(0, 200)
    console.error('Membership check failed:', detail)
    return res.redirect(`/login?error=membership_check&detail=${encodeURIComponent(detail)}`)
  }

  if (!hasAccess) {
    return res.redirect(`/login?error=no_membership`)
  }

  const session = {
    token:        access_token,
    refreshToken: refresh_token,
    expires_at:   Date.now() + expires_in * 1000,
    lastChecked:  Date.now(),
  }

  const jwtToken = jwt.sign(session, JWT_SECRET, { expiresIn: `${MAX_AGE}s` })

  const cookie = serialize(COOKIE_NAME, jwtToken, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   MAX_AGE,
  })

  const clearVerifier = serialize('whop_cv', '', { maxAge: 0, path: '/' })
  res.setHeader('Set-Cookie', [cookie, clearVerifier])
  res.redirect('/')
}
