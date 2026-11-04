using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Surflix.Sso;

/// <summary>
/// The cookie format shared with Surflix (lib/sso-cookie.ts):
/// base64url(JSON {"u": userId, "n": name, "e": expiry in epoch seconds}) + "." + base64url(HMAC-SHA256(payload, secret)).
/// Only a user id and a display name are in it. No password and no Jellyfin token.
/// </summary>
public static class SsoCookie
{
    public const string CookieName = "surflix_sso";

    public static string Create(string secret, string userId, string name, DateTimeOffset expires)
    {
        var json = JsonSerializer.Serialize(new Dictionary<string, object> { ["u"] = userId, ["n"] = name, ["e"] = expires.ToUnixTimeSeconds() });
        var payload = Base64Url(Encoding.UTF8.GetBytes(json));
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        return payload + "." + Base64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    /// <summary>Reads the user id and expiry out of an existing cookie WITHOUT checking the signature (only used to decide whether to renew it).</summary>
    public static (string UserId, long Expires)? Peek(string? cookie)
    {
        if (string.IsNullOrEmpty(cookie)) return null;
        var dot = cookie.IndexOf('.');
        if (dot < 1) return null;
        try
        {
            using var doc = JsonDocument.Parse(FromBase64Url(cookie[..dot]));
            return (doc.RootElement.GetProperty("u").GetString() ?? string.Empty, doc.RootElement.GetProperty("e").GetInt64());
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static string Base64Url(byte[] bytes) => Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        return Convert.FromBase64String(s.PadRight(s.Length + (4 - s.Length % 4) % 4, '='));
    }
}
