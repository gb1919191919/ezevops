const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = 54321;
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
const TOKENS_PATH = path.join(process.env.HOME || '/home/bhuvnesh', '.gemini', 'mcp-oauth-tokens.json');

function generatePKCE() {
  const codeVerifier = crypto.randomBytes(64).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('base64url');
  return { codeVerifier, codeChallenge, state };
}

async function main() {
  console.log('=== Supabase MCP OAuth Authenticator ===\n');

  // 1. Dynamic Client Registration
  console.log('1. Registering client with Supabase OAuth server...');
  const regUrl = 'https://api.supabase.com/platform/oauth/apps/register';
  const regBody = {
    client_name: 'Gemini CLI MCP Client',
    redirect_uris: [REDIRECT_URI],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'client_secret_post',
    scope: 'organizations:read projects:read projects:write database:write database:read analytics:read secrets:read edge_functions:read edge_functions:write environment:read environment:write storage:read storage:write',
  };

  const regRes = await fetch(regUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regBody),
  });

  if (!regRes.ok) {
    console.error('Registration failed:', regRes.status, await regRes.text());
    process.exit(1);
  }

  const clientInfo = await regRes.json();
  console.log('Client registered successfully. Client ID:', clientInfo.client_id);

  // 2. PKCE Setup
  const { codeVerifier, codeChallenge, state } = generatePKCE();

  // 3. Build Auth URL
  const authUrlObj = new URL('https://api.supabase.com/v1/oauth/authorize');
  authUrlObj.searchParams.set('client_id', clientInfo.client_id);
  authUrlObj.searchParams.set('response_type', 'code');
  authUrlObj.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrlObj.searchParams.set('state', state);
  authUrlObj.searchParams.set('code_challenge', codeChallenge);
  authUrlObj.searchParams.set('code_challenge_method', 'S256');
  authUrlObj.searchParams.set('scope', regBody.scope);
  authUrlObj.searchParams.set(
    'resource',
    'https://mcp.supabase.com/mcp?project_ref=yliozdsnqnfjkpcuctwe&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage'
  );

  const authUrl = authUrlObj.toString();

  // 4. Start Local Server
  const server = http.createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname !== '/oauth/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = reqUrl.searchParams.get('code');
      const returnedState = reqUrl.searchParams.get('state');
      const error = reqUrl.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #09090b; color: #ef4444;">
            <h2>Authentication Failed</h2>
            <p>${error}</p>
          </div>
        `);
        console.error('OAuth authorization error:', error);
        server.close();
        process.exit(1);
      }

      if (!code || returnedState !== state) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('Invalid state or code parameter');
        server.close();
        process.exit(1);
      }

      // Exchange code for tokens
      console.log('Exchanging authorization code for tokens...');
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
        client_id: clientInfo.client_id,
        client_secret: clientInfo.client_secret || '',
      });

      const tokenRes = await fetch('https://api.supabase.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: tokenParams.toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`Failed to exchange token: ${errText}`);
        console.error('Token exchange failed:', errText);
        server.close();
        process.exit(1);
      }

      const tokenData = await tokenRes.json();
      console.log('Token acquired successfully!');

      // Save token to ~/.gemini/mcp-oauth-tokens.json
      let existingTokens = [];
      try {
        if (fs.existsSync(TOKENS_PATH)) {
          existingTokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
        }
      } catch (e) {
        existingTokens = [];
      }

      const credEntry = {
        serverName: 'supabase',
        token: {
          accessToken: tokenData.access_token,
          tokenType: tokenData.token_type || 'Bearer',
          refreshToken: tokenData.refresh_token,
          expiresAt: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined,
          scope: tokenData.scope,
        },
        oauthConfig: {
          clientId: clientInfo.client_id,
          clientSecret: clientInfo.client_secret,
          tokenUrl: 'https://api.supabase.com/v1/oauth/token',
          authorizationUrl: 'https://api.supabase.com/v1/oauth/authorize',
          redirectUri: REDIRECT_URI,
        },
        updatedAt: Date.now(),
      };

      const filtered = existingTokens.filter((t) => t.serverName !== 'supabase');
      filtered.push(credEntry);

      fs.mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
      fs.writeFileSync(TOKENS_PATH, JSON.stringify(filtered, null, 2), { mode: 0o600 });
      console.log(`Saved credentials to ${TOKENS_PATH}`);

      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 60px auto; padding: 32px; background: #09090b; color: #f4f4f5; border: 1px solid #27272a; border-radius: 16px; text-align: center;">
          <h2 style="color: #10b981; margin-top: 0;">Authentication Successful!</h2>
          <p style="color: #a1a1aa; font-size: 14px;">Supabase MCP server is now authenticated with Gemini CLI.</p>
          <p style="color: #71717a; font-size: 12px;">You may close this browser tab.</p>
        </div>
      `);

      setTimeout(() => {
        server.close();
        console.log('\n=== MCP Authentication Flow Finished Successfully! ===');
        process.exit(0);
      }, 1000);
    } catch (e) {
      console.error('Error handling callback:', e);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`Callback listener running on http://localhost:${PORT}/oauth/callback`);
    console.log('\n------------------------------------------------------------');
    console.log('PLEASE OPEN THIS URL IN YOUR BROWSER TO AUTHENTICATE SUPABASE:');
    console.log('------------------------------------------------------------\n');
    console.log(authUrl);
    console.log('\n------------------------------------------------------------');
    console.log('Waiting for authentication callback in background...');
  });
}

main().catch(console.error);
