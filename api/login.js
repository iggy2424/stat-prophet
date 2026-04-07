import crypto from 'crypto'
import { serialize } from 'cookie'

const CLIENT_ID    = process.env.WHOP_CLIENT_ID
const REDIRECT_URI = 'https://app.trendbet.ai/api/callback'

export default function handler(req, res) {
  // Generate PKCE code_verifier + code_challenge
  const codeVerifier  = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')
  const nonce = crypto.randomBytes(16).toString('base64url')

  // Store verifier in a short-lived cookie for the callback to read
  const verifierCookie = serialize('whop_cv', codeVerifier, {
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     '/',
    maxAge:   60 * 10, // 10 minutes
  })

  const params = new URLSearchParams({
    client_id:              CLIENT_ID,
    redirect_uri:           REDIRECT_URI,
    response_type:          'code',
    scope:                  'openid profile email',
    nonce:                  nonce,
    code_challenge:         codeChallenge,
    code_challenge_method:  'S256',
  })

  res.setHeader('Set-Cookie', verifierCookie)
  res.redirect(`https://api.whop.com/oauth/authorize?${params}`)
}
