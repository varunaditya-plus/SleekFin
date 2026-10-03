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

    public int HeroSlidesShown { get; set; } = HeroConfiguration.DefaultSlidesShown;

    public string HeroContentAlignment { get; set; } = HeroConfiguration.DefaultContentAlignment;

    public string HeroVerticalAlignment { get; set; } = HeroConfiguration.DefaultVerticalAlignment;

    public int HeroMobileHeight { get; set; } = HeroConfiguration.DefaultMobileHeight;

    public int HeroDesktopHeight { get; set; } = HeroConfiguration.DefaultDesktopHeight;

    public int HeroContentMaxWidth { get; set; } = HeroConfiguration.DefaultContentMaxWidth;

    public string HeroTitleTreatment { get; set; } = HeroConfiguration.DefaultTitleTreatment;

    public string HeroBackdropFit { get; set; } = HeroConfiguration.DefaultBackdropFit;

    public int HeroBackdropFocusX { get; set; } = HeroConfiguration.DefaultBackdropFocusX;

    public int HeroBackdropFocusY { get; set; } = HeroConfiguration.DefaultBackdropFocusY;

    public int HeroBackdropOpacity { get; set; } = HeroConfiguration.DefaultBackdropOpacity;

    public int HeroTitleSize { get; set; } = HeroConfiguration.DefaultTitleSize;

    public int HeroTitleWeight { get; set; } = HeroConfiguration.DefaultTitleWeight;

    public string HeroTitleCase { get; set; } = HeroConfiguration.DefaultTitleCase;

    public int HeroDescriptionSize { get; set; } = HeroConfiguration.DefaultDescriptionSize;

    public int HeroDescriptionWeight { get; set; } = HeroConfiguration.DefaultDescriptionWeight;

    public string HeroDescriptionColor { get; set; } = HeroConfiguration.DefaultDescriptionColor;

    public int HeroDescriptionLines { get; set; } = HeroConfiguration.DefaultDescriptionLines;

    public string HeroTitleColor { get; set; } = HeroConfiguration.DefaultTitleColor;

    public int HeroButtonHeight { get; set; } = HeroConfiguration.DefaultButtonHeight;

    public string HeroPrimaryButtonBackgroundColor { get; set; } = HeroConfiguration.DefaultPrimaryButtonBackgroundColor;

    public string HeroPrimaryButtonTextColor { get; set; } = HeroConfiguration.DefaultPrimaryButtonTextColor;

    public int HeroPrimaryButtonOpacity { get; set; } = HeroConfiguration.DefaultPrimaryButtonOpacity;

    public string HeroSecondaryButtonBackgroundColor { get; set; } = HeroConfiguration.DefaultSecondaryButtonBackgroundColor;

    public int HeroSecondaryButtonOpacity { get; set; } = HeroConfiguration.DefaultSecondaryButtonOpacity;

    public string HeroButtonCornerStyle { get; set; } = HeroConfiguration.DefaultButtonCornerStyle;

    public string HeroSecondaryButtonTextColor { get; set; } = HeroConfiguration.DefaultSecondaryButtonTextColor;

    public int HeroAutoRotateSeconds { get; set; } = HeroConfiguration.DefaultAutoRotateSeconds;

    public string HeroTransitionStyle { get; set; } = HeroConfiguration.DefaultTransitionStyle;

    public int HeroTransitionDurationMs { get; set; } = HeroConfiguration.DefaultTransitionDurationMs;

    public bool HeroSwipeEnabled { get; set; } = HeroConfiguration.DefaultSwipeEnabled;

    public int HeroVignetteStrength { get; set; } = HeroConfiguration.DefaultVignetteStrength;

    public bool DetailsEnabled { get; set; } = true;

    public bool DetailsSeasonPickerEnabled { get; set; } = false;

    public bool DetailsTrailerBackgroundEnabled { get; set; } = false;

    public string HeroContentOrder { get; set; } = "ContinueWatching,NextUp,LatestMovies,LatestShows,Favorites";

    public bool HeroRandomized { get; set; }
}
