using System.Security.Claims;
using MediaBrowser.Controller.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;

namespace Surflix.Sso;

/// <summary>
/// Runs on every API response (as an MVC result filter) and keeps the Surflix cookie in step with the Jellyfin session:
///   - a successful sign-in (the response is an AuthenticationResult) sets the cookie;
///   - any other request from an already signed-in browser sets it if it is missing (so nobody has to sign in again);
///   - signing out (/Sessions/Logout) removes it.
/// Requests made with an API key (Surflix itself talking to Jellyfin) are ignored.
/// </summary>
public sealed class SsoCookieFilter : IResultFilter
{
    private const string UserIdClaim = "Jellyfin-UserId";   // Jellyfin.Api InternalClaimTypes.UserId (checked in v12.0)
    private const string IsApiKeyClaim = "Jellyfin-IsApiKey";
    private static readonly TimeSpan RenewWhenLeft = TimeSpan.FromDays(7);

    private readonly SsoSettings _settings = new();
    private readonly ILogger<SsoCookieFilter> _logger;
    private static bool _warned;

    public SsoCookieFilter(ILogger<SsoCookieFilter> logger)
    {
        _logger = logger;
    }

    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (!_settings.Enabled)
        {
            if (!_warned)
            {
                _warned = true;
                _logger.LogWarning("Surflix SSO is installed but SURFLIX_SSO_SECRET is missing or shorter than 16 characters: the plugin does nothing.");
            }
            return;
        }

        try
        {
            var http = context.HttpContext;
            var path = http.Request.Path.Value ?? string.Empty;

            if (path.EndsWith("/Sessions/Logout", StringComparison.OrdinalIgnoreCase))
            {
                Remove(http);
                return;
            }

            if (context.Result is ObjectResult { Value: AuthenticationResult result } && result.User is not null)
            {
                Set(http, result.User.Id.ToString("N"), result.User.Name ?? string.Empty);
                return;
            }

            var user = http.User;
            var id = user.FindFirstValue(UserIdClaim);
            if (string.IsNullOrEmpty(id) || string.Equals(user.FindFirstValue(IsApiKeyClaim), "True", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var name = user.FindFirstValue(ClaimTypes.Name);
            if (string.IsNullOrEmpty(name))
            {
                return;
            }

            var existing = SsoCookie.Peek(http.Request.Cookies[SsoCookie.CookieName]);
            var keep = existing is { } e
                && string.Equals(e.UserId, id, StringComparison.OrdinalIgnoreCase)
                && e.Expires > DateTimeOffset.UtcNow.Add(RenewWhenLeft).ToUnixTimeSeconds();
            if (!keep)
            {
                Set(http, id, name);
            }
        }
        catch (Exception ex)
        {
            // Never break a Jellyfin response because of this plugin.
            _logger.LogError(ex, "Surflix SSO could not update its cookie");
        }
    }

    public void OnResultExecuted(ResultExecutedContext context)
    {
    }

    private void Set(HttpContext http, string userId, string name)
    {
        var expires = DateTimeOffset.UtcNow.Add(_settings.Lifetime);
        http.Response.Cookies.Append(SsoCookie.CookieName, SsoCookie.Create(_settings.Secret!, userId, name, expires), Options(expires));
    }

    private void Remove(HttpContext http)
    {
        http.Response.Cookies.Delete(SsoCookie.CookieName, Options(null));
    }

    private CookieOptions Options(DateTimeOffset? expires)
    {
        var o = new CookieOptions
        {
            HttpOnly = true,
            Secure = _settings.Secure,
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = expires,
            MaxAge = expires is null ? null : _settings.Lifetime,
        };
        if (!string.IsNullOrWhiteSpace(_settings.Domain))
        {
            o.Domain = _settings.Domain;
        }

        return o;
    }
}
