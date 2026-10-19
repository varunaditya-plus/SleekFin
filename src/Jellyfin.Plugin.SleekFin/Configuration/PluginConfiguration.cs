using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.SleekFin.Configuration;

public sealed class PluginConfiguration : BasePluginConfiguration
{
    public const string DefaultAccentColor = "#dc2626";
    public const string DefaultDropdownStyle = "Jellyfin";
    public const string DefaultCardShape = "Squircle";
    public const string DefaultPlayButtonShape = "Circle";

    private string _accentColor = DefaultAccentColor;
    private string _cardButtonShape = DefaultCardShape;
    private string _playButtonShape = DefaultPlayButtonShape;
    private string _mediaCardShape = DefaultCardShape;
    private string _castCrewShape = DefaultCardShape;
    private string? _dropdownStyle;

    public string AccentColor
    {
        get => _accentColor;
        set
        {
            string color = value?.Trim() ?? string.Empty;
            _accentColor = color.Length == 7 && color[0] == '#' && color.Skip(1).All(char.IsAsciiHexDigit)
                ? color.ToLowerInvariant()
                : DefaultAccentColor;
        }
    }

    public string CardButtonShape
    {
        get => _cardButtonShape;
        set => _cardButtonShape = NormalizeShape(value, DefaultCardShape);
    }

    public string PlayButtonShape
    {
        get => _playButtonShape;
        set => _playButtonShape = NormalizeShape(value, DefaultPlayButtonShape);
    }

    public string MediaCardShape
    {
        get => _mediaCardShape;
        set => _mediaCardShape = NormalizeShape(value, DefaultCardShape);
    }

    public string CastCrewShape
    {
        get => _castCrewShape;
        set => _castCrewShape = NormalizeShape(value, DefaultCardShape);
    }

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

    public string DropdownStyle
    {
        get => _dropdownStyle ?? (DetailsSeasonPickerEnabled ? "SeerrFin" : DefaultDropdownStyle);
        set => _dropdownStyle = value?.Trim().ToLowerInvariant() switch
        {
            "seerrfin" => "SeerrFin",
            "native" => "Native",
            _ => DefaultDropdownStyle
        };
    }

    public bool DetailsSeasonPostersEnabled { get; set; } = false;

    public bool DetailsCompactEpisodeGridCardsEnabled { get; set; } = false;

    public bool DetailsTrailerBackgroundEnabled { get; set; } = false;

    public string HeroContentOrder { get; set; } = "ContinueWatching,NextUp,LatestMovies,LatestShows,Favorites";

    public bool HeroRandomized { get; set; }

    private static string NormalizeShape(string? value, string fallback) => value?.Trim().ToLowerInvariant() switch
    {
        "square" => "Square",
        "squircle" => "Squircle",
        "circle" => "Circle",
        _ => fallback
    };
}
