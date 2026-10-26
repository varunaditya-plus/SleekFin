using Jellyfin.Plugin.SleekFin.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.SleekFin;

public sealed class SleekFinPlugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public SleekFinPlugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
        HeaderConfiguration.Normalize(Configuration);
        HeroConfiguration.Normalize(Configuration);
        DetailsConfiguration.Normalize(Configuration);
    }

    public static SleekFinPlugin Instance { get; private set; } = null!;

    public override Guid Id => Guid.Parse("da36c4ef-1d10-4169-8a68-26b194d5301a");

    public override string Name => "SleekFin";

    public override string Description => "The ultimate Jellyfin Web revamp, with new elements, styles, plus compatible with the most popular plugins.";

    public override void UpdateConfiguration(BasePluginConfiguration configuration)
    {
        if (configuration is PluginConfiguration pluginConfiguration)
        {
            HeaderConfiguration.Normalize(pluginConfiguration);
            HeroConfiguration.Normalize(pluginConfiguration);
            DetailsConfiguration.Normalize(pluginConfiguration);
        }

        base.UpdateConfiguration(configuration);
    }

    public IEnumerable<PluginPageInfo> GetPages()
    {
        yield return new PluginPageInfo
        {
            Name = Name,
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.config.html",
            EnableInMainMenu = true,
            DisplayName = Name,
            MenuIcon = "format_paint"
        };
    }
}
