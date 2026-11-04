namespace Surflix.Sso;

/// <summary>Settings come from environment variables of the Jellyfin container, so no secret lives in a config file.</summary>
public sealed class SsoSettings
{
    /// <summary>Shared with Surflix (SSO_SHARED_SECRET there). At least 16 characters.</summary>
    public string? Secret { get; } = Environment.GetEnvironmentVariable("SURFLIX_SSO_SECRET");

    /// <summary>Cookie domain, e.g. ".surflix.my.id", so the cookie reaches the Surflix hosts. Empty = this host only.</summary>
    public string? Domain { get; } = Environment.GetEnvironmentVariable("SURFLIX_SSO_DOMAIN");

    /// <summary>Set to "false" only for plain-http testing. Default true.</summary>
    public bool Secure { get; } = !string.Equals(Environment.GetEnvironmentVariable("SURFLIX_SSO_SECURE"), "false", StringComparison.OrdinalIgnoreCase);

    public TimeSpan Lifetime { get; } = TimeSpan.FromDays(30);

    public bool Enabled => !string.IsNullOrEmpty(Secret) && Secret.Length >= 16;
}
