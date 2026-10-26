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

    public bool DetailsTrailerBackgroundEnabled { get; set; } = DetailsConfiguration.DefaultTrailerBackgroundEnabled;

    public int DetailsDesktopHeight { get; set; } = DetailsConfiguration.DefaultDesktopHeight;

    public int DetailsMobileHeight { get; set; } = DetailsConfiguration.DefaultMobileHeight;

    public int DetailsMobileMinHeight { get; set; } = DetailsConfiguration.DefaultMobileMinHeight;

    public string DetailsContentAlignment { get; set; } = DetailsConfiguration.DefaultContentAlignment;

    public string DetailsVerticalAlignment { get; set; } = DetailsConfiguration.DefaultVerticalAlignment;

    public string DetailsDesktopSideInset { get; set; } = DetailsConfiguration.DefaultDesktopSideInset;

    public string DetailsMobileSideInset { get; set; } = DetailsConfiguration.DefaultMobileSideInset;

    public int DetailsDesktopBottomSpacing { get; set; } = DetailsConfiguration.DefaultDesktopBottomSpacing;

    public int DetailsMobileBottomSpacing { get; set; } = DetailsConfiguration.DefaultMobileBottomSpacing;

    public int DetailsContentMaxWidth { get; set; } = DetailsConfiguration.DefaultContentMaxWidth;

    public string DetailsButtonGroupSpacing { get; set; } = DetailsConfiguration.DefaultButtonGroupSpacing;

    public int DetailsTitleMetadataSpacing { get; set; } = DetailsConfiguration.DefaultTitleMetadataSpacing;

    public int DetailsMetadataGenresSpacing { get; set; } = DetailsConfiguration.DefaultMetadataGenresSpacing;

    public int DetailsGenresDescriptionSpacing { get; set; } = DetailsConfiguration.DefaultGenresDescriptionSpacing;

    public int DetailsDescriptionButtonSpacing { get; set; } = DetailsConfiguration.DefaultDescriptionButtonSpacing;

    public string DetailsBackdropFit { get; set; } = DetailsConfiguration.DefaultBackdropFit;

    public int DetailsBackdropFocusX { get; set; } = DetailsConfiguration.DefaultBackdropFocusX;

    public int DetailsBackdropFocusY { get; set; } = DetailsConfiguration.DefaultBackdropFocusY;

    public int DetailsBackdropOpacity { get; set; } = DetailsConfiguration.DefaultBackdropOpacity;

    public int DetailsSideShading { get; set; } = DetailsConfiguration.DefaultSideShading;

    public int DetailsBottomFade { get; set; } = DetailsConfiguration.DefaultBottomFade;

    public int DetailsFadeHeight { get; set; } = DetailsConfiguration.DefaultFadeHeight;

    public int DetailsBackdropBlur { get; set; } = DetailsConfiguration.DefaultBackdropBlur;

    public double DetailsTrailerStartDelaySeconds { get; set; } = DetailsConfiguration.DefaultTrailerStartDelaySeconds;

    public string DetailsTrailerAudio { get; set; } = DetailsConfiguration.DefaultTrailerAudio;

    public string DetailsTrailerEndBehavior { get; set; } = DetailsConfiguration.DefaultTrailerEndBehavior;

    public bool DetailsBackdropPauseEnabled { get; set; } = DetailsConfiguration.DefaultBackdropPauseEnabled;

    public string DetailsTitleTreatment { get; set; } = DetailsConfiguration.DefaultTitleTreatment;

    public bool DetailsShowTitle { get; set; } = DetailsConfiguration.DefaultShowTitle;

    public int DetailsDesktopLogoMaxWidth { get; set; } = DetailsConfiguration.DefaultDesktopLogoMaxWidth;

    public int DetailsMobileLogoMaxWidth { get; set; } = DetailsConfiguration.DefaultMobileLogoMaxWidth;

    public int DetailsDesktopLogoHeight { get; set; } = DetailsConfiguration.DefaultDesktopLogoHeight;

    public int DetailsMobileLogoHeight { get; set; } = DetailsConfiguration.DefaultMobileLogoHeight;

    public int DetailsDesktopTitleSize { get; set; } = DetailsConfiguration.DefaultDesktopTitleSize;

    public int DetailsMobileTitleSize { get; set; } = DetailsConfiguration.DefaultMobileTitleSize;

    public int DetailsTitleWeight { get; set; } = DetailsConfiguration.DefaultTitleWeight;

    public string DetailsTitleCase { get; set; } = DetailsConfiguration.DefaultTitleCase;

    public string DetailsTitleColor { get; set; } = DetailsConfiguration.DefaultTitleColor;

    public int DetailsTitleLineHeight { get; set; } = DetailsConfiguration.DefaultTitleLineHeight;

    public int DetailsTitleLetterSpacing { get; set; } = DetailsConfiguration.DefaultTitleLetterSpacing;

    public int DetailsTitleShadow { get; set; } = DetailsConfiguration.DefaultTitleShadow;

    public string DetailsOriginalTitleMode { get; set; } = DetailsConfiguration.DefaultOriginalTitleMode;

    public int DetailsOriginalTitleSize { get; set; } = DetailsConfiguration.DefaultOriginalTitleSize;

    public string DetailsOriginalTitleColor { get; set; } = DetailsConfiguration.DefaultOriginalTitleColor;

    public bool DetailsShowParentTitle { get; set; } = DetailsConfiguration.DefaultShowParentTitle;

    public int DetailsParentTitleSize { get; set; } = DetailsConfiguration.DefaultParentTitleSize;

    public string DetailsParentTitleColor { get; set; } = DetailsConfiguration.DefaultParentTitleColor;

    public int DetailsDesktopChildHeadingSize { get; set; } = DetailsConfiguration.DefaultDesktopChildHeadingSize;

    public int DetailsMobileChildHeadingSize { get; set; } = DetailsConfiguration.DefaultMobileChildHeadingSize;

    public int DetailsChildHeadingWeight { get; set; } = DetailsConfiguration.DefaultChildHeadingWeight;

    public int DetailsChildHeadingLines { get; set; } = DetailsConfiguration.DefaultChildHeadingLines;

    public string DetailsChildHeadingColor { get; set; } = DetailsConfiguration.DefaultChildHeadingColor;

    public bool DetailsShowRating { get; set; } = DetailsConfiguration.DefaultShowRating;

    public bool DetailsShowYear { get; set; } = DetailsConfiguration.DefaultShowYear;

    public bool DetailsShowRuntime { get; set; } = DetailsConfiguration.DefaultShowRuntime;

    public bool DetailsShowCertification { get; set; } = DetailsConfiguration.DefaultShowCertification;

    public bool DetailsShowAudioLanguages { get; set; } = DetailsConfiguration.DefaultShowAudioLanguages;

    public bool DetailsShowGenres { get; set; } = DetailsConfiguration.DefaultShowGenres;

    public int DetailsDesktopMetadataSize { get; set; } = DetailsConfiguration.DefaultDesktopMetadataSize;

    public int DetailsMobileMetadataSize { get; set; } = DetailsConfiguration.DefaultMobileMetadataSize;

    public int DetailsMetadataWeight { get; set; } = DetailsConfiguration.DefaultMetadataWeight;

    public string DetailsMetadataColor { get; set; } = DetailsConfiguration.DefaultMetadataColor;

    public string DetailsRatingColor { get; set; } = DetailsConfiguration.DefaultRatingColor;

    public string DetailsGenresColor { get; set; } = DetailsConfiguration.DefaultGenresColor;

    public string DetailsFactSeparator { get; set; } = DetailsConfiguration.DefaultFactSeparator;

    public bool DetailsShowDescription { get; set; } = DetailsConfiguration.DefaultShowDescription;

    public int DetailsDesktopDescriptionSize { get; set; } = DetailsConfiguration.DefaultDesktopDescriptionSize;

    public int DetailsMobileDescriptionSize { get; set; } = DetailsConfiguration.DefaultMobileDescriptionSize;

    public int DetailsDescriptionWidth { get; set; } = DetailsConfiguration.DefaultDescriptionWidth;

    public int DetailsDescriptionLines { get; set; } = DetailsConfiguration.DefaultDescriptionLines;

    public string DetailsDescriptionColor { get; set; } = DetailsConfiguration.DefaultDescriptionColor;

    public int DetailsDescriptionWeight { get; set; } = DetailsConfiguration.DefaultDescriptionWeight;

    public int DetailsDescriptionLineHeight { get; set; } = DetailsConfiguration.DefaultDescriptionLineHeight;

    public bool DetailsDescriptionExpandEnabled { get; set; } = DetailsConfiguration.DefaultDescriptionExpandEnabled;

    public int DetailsDesktopButtonHeight { get; set; } = DetailsConfiguration.DefaultDesktopButtonHeight;

    public int DetailsMobileButtonHeight { get; set; } = DetailsConfiguration.DefaultMobileButtonHeight;

    public int DetailsButtonSpacing { get; set; } = DetailsConfiguration.DefaultButtonSpacing;

    public string DetailsButtonContent { get; set; } = DetailsConfiguration.DefaultButtonContent;

    public string DetailsButtonCornerStyle { get; set; } = DetailsConfiguration.DefaultButtonCornerStyle;

    public string DetailsIconButtonCornerStyle { get; set; } = DetailsConfiguration.DefaultIconButtonCornerStyle;

    public string DetailsPrimaryButtonBackgroundColor { get; set; } = DetailsConfiguration.DefaultPrimaryButtonBackgroundColor;

    public string DetailsPrimaryButtonTextColor { get; set; } = DetailsConfiguration.DefaultPrimaryButtonTextColor;

    public int DetailsPrimaryButtonOpacity { get; set; } = DetailsConfiguration.DefaultPrimaryButtonOpacity;

    public string DetailsSecondaryButtonBackgroundColor { get; set; } = DetailsConfiguration.DefaultSecondaryButtonBackgroundColor;

    public string DetailsSecondaryButtonTextColor { get; set; } = DetailsConfiguration.DefaultSecondaryButtonTextColor;

    public int DetailsSecondaryButtonOpacity { get; set; } = DetailsConfiguration.DefaultSecondaryButtonOpacity;

    public int DetailsDesktopPlayIconSize { get; set; } = DetailsConfiguration.DefaultDesktopPlayIconSize;

    public int DetailsMobilePlayIconSize { get; set; } = DetailsConfiguration.DefaultMobilePlayIconSize;

    public int DetailsButtonBlur { get; set; } = DetailsConfiguration.DefaultButtonBlur;

    public int DetailsControlIconSize { get; set; } = DetailsConfiguration.DefaultControlIconSize;

    public int DetailsExternalIconSize { get; set; } = DetailsConfiguration.DefaultExternalIconSize;

    public int DetailsButtonHoverOpacity { get; set; } = DetailsConfiguration.DefaultButtonHoverOpacity;

    public int DetailsButtonHoverLift { get; set; } = DetailsConfiguration.DefaultButtonHoverLift;

    public string DetailsButtonActiveColor { get; set; } = DetailsConfiguration.DefaultButtonActiveColor;

    public string DetailsMobileActionGroups { get; set; } = DetailsConfiguration.DefaultMobileActionGroups;

    public string DetailsButtonOverflow { get; set; } = DetailsConfiguration.DefaultButtonOverflow;

    public int DetailsInfoPanelMaxWidth { get; set; } = DetailsConfiguration.DefaultInfoPanelMaxWidth;

    public bool DetailsShowVersionPicker { get; set; } = DetailsConfiguration.DefaultShowVersionPicker;

    public bool DetailsShowVideoDetails { get; set; } = DetailsConfiguration.DefaultShowVideoDetails;

    public bool DetailsShowAudioPicker { get; set; } = DetailsConfiguration.DefaultShowAudioPicker;

    public bool DetailsShowSubtitlePicker { get; set; } = DetailsConfiguration.DefaultShowSubtitlePicker;

    public bool DetailsShowItemMetadata { get; set; } = DetailsConfiguration.DefaultShowItemMetadata;

    public bool DetailsShowExternalLinks { get; set; } = DetailsConfiguration.DefaultShowExternalLinks;

    public string DetailsLeftActions { get; set; } = DetailsConfiguration.DefaultLeftActions;

    public string DetailsRightActions { get; set; } = DetailsConfiguration.DefaultRightActions;

    public string DetailsHiddenActions { get; set; } = DetailsConfiguration.DefaultHiddenActions;

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
