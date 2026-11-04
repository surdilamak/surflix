using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Surflix.Sso;

public sealed class PluginConfiguration : BasePluginConfiguration
{
}

/// <summary>Surflix SSO: signs people in to the Surflix sites (landing, Request Hub, Reference) when they sign in to Jellyfin.</summary>
public sealed class Plugin : BasePlugin<PluginConfiguration>
{
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
    }

    public override string Name => "Surflix SSO";

    public override Guid Id => Guid.Parse("95fe8944-61e8-45c7-8fbf-f0172a4e1249");

    public override string Description => "Shares your Jellyfin sign-in with the Surflix Request Hub and Reference.";
}
