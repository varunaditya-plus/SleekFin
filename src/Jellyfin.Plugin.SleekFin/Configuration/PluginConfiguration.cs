using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SleekFin.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public bool HeaderEnabled { get; set; } = true;

    public string HeaderItemOrder { get; set; } = string.Empty;

    public string HeaderHiddenItems { get; set; } = string.Empty;

    public string HeaderBrandDisplay { get; set; } = HeaderConfiguration.DefaultBrandDisplay;

    public string HeaderBrandPosition { get; set; } = HeaderConfiguration.DefaultBrandPosition;

    public string HeaderBarPosition { get; set; } = HeaderConfiguration.DefaultBarPosition;

    public int HeaderHeight { get; set; } = HeaderConfiguration.DefaultHeight;

    public int HeaderLogoHeight { get; set; } = HeaderConfiguration.DefaultLogoHeight;

    public string HeaderServerNameColor { get; set; } = HeaderConfiguration.DefaultServerNameColor;

    public int HeaderBrandSpacing { get; set; } = HeaderConfiguration.DefaultBrandSpacing;

    public int HeaderItemSpacing { get; set; } = HeaderConfiguration.DefaultItemSpacing;

    public int HeaderItemHeight { get; set; } = HeaderConfiguration.DefaultItemHeight;

    public int HeaderBarPadding { get; set; } = HeaderConfiguration.DefaultBarPadding;

    public string HeaderItemBackgroundColor { get; set; } = HeaderConfiguration.DefaultItemBackgroundColor;

    public string HeaderItemTextColor { get; set; } = HeaderConfiguration.DefaultItemTextColor;

    public string HeaderActiveItemBackgroundColor { get; set; } = HeaderConfiguration.DefaultActiveItemBackgroundColor;

    public string HeaderActiveItemTextColor { get; set; } = HeaderConfiguration.DefaultActiveItemTextColor;

    public int HeaderHoverOpacity { get; set; } = HeaderConfiguration.DefaultHoverOpacity;

    public int HeaderActiveItemOpacity { get; set; } = HeaderConfiguration.DefaultActiveItemOpacity;

    public bool HeroEnabled { get; set; } = true;

    public bool DetailsEnabled { get; set; } = true;

    public string HeroContentOrder { get; set; } = "ContinueWatching,NextUp,LatestMovies,LatestShows,Favorites";

    public bool HeroRandomized { get; set; }
}
