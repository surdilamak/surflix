# Surflix SSO (Jellyfin plugin)

Signs people in to the Surflix sites (landing, Request Hub, Reference) when they sign in to Jellyfin.

## What it does
- When someone signs in to Jellyfin, the plugin adds a cookie `surflix_sso` for the Surflix domain (for example `.surflix.my.id`).
- The cookie holds only the Jellyfin user id and display name, signed with a shared secret (HMAC-SHA256). No password, no Jellyfin token.
- A browser that is already signed in to Jellyfin gets the cookie on its next Jellyfin request, so nobody has to sign in again.
- Signing out of Jellyfin removes the cookie. Signing out on a Surflix site removes it too.
- Surflix checks the signature in `lib/sso-cookie.ts`. Without `SSO_SHARED_SECRET` the feature is off.
- Requests made with an API key (Surflix itself talking to Jellyfin) are ignored.

## Target
Jellyfin 12.x: `net10.0`, `targetAbi 12.0.0.0`, packages `Jellyfin.Controller` and `Jellyfin.Model` 12.0.0.
Plugins built for 10.11 do not load on 12.

## Install (Unraid)
1. Get the build: the GitHub Actions run "Build Jellyfin plugin (Surflix SSO)" has an artifact `surflix-sso-plugin` with a folder `Surflix SSO_1.0.0.0`.
2. Copy that whole folder into the Jellyfin config share, under `plugins/` (next to the other plugin folders).
3. Add three variables to the Jellyfin container:
   - `SURFLIX_SSO_SECRET` = a random string of at least 16 characters (`openssl rand -base64 32`)
   - `SURFLIX_SSO_DOMAIN` = `.surflix.my.id`
   - (optional) `SURFLIX_SSO_SECURE` = `false` only for plain-http testing; default is secure
4. Add `SSO_SHARED_SECRET` = the same string, and `VIEWER_COOKIE_DOMAIN` = `.surflix.my.id`, to the Surflix stack. Redeploy it.
5. Restart Jellyfin. The log shows `Loaded plugin: Surflix SSO 1.0.0.0`.

Jellyfin must be reached over https on a host under the cookie domain (for example `streaming.surflix.my.id`).

## Remove
Delete the plugin folder and restart Jellyfin. Surflix keeps working with its own sign-in form.

## Notes for developers
- Code: `Surflix.Sso/` (`SsoCookieFilter` is an MVC result filter registered in `PluginServiceRegistrator`).
- Build: `dotnet build -c Release` in `Surflix.Sso/` (needs the .NET 10 SDK).
- The claim names (`Jellyfin-UserId`, `Jellyfin-IsApiKey`) come from `Jellyfin.Api` `InternalClaimTypes` (checked against v12.0).
