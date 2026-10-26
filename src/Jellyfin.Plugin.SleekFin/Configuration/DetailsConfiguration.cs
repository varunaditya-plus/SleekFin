using System.Globalization;

namespace Jellyfin.Plugin.SleekFin.Configuration;

internal static class DetailsConfiguration
{
    public const int DefaultDesktopHeight = 85;
    public const int DefaultMobileHeight = 85;
    public const int DefaultMobileMinHeight = 620;
    public const string DefaultContentAlignment = "Left";
    public const string DefaultVerticalAlignment = "Bottom";
    public const string DefaultDesktopSideInset = "Auto";
    public const string DefaultMobileSideInset = "Auto";
    public const int DefaultDesktopBottomSpacing = 72;
    public const int DefaultMobileBottomSpacing = 48;
    public const int DefaultContentMaxWidth = 520;
    public const string DefaultButtonGroupSpacing = "Auto";
    public const int DefaultTitleMetadataSpacing = 16;
    public const int DefaultMetadataGenresSpacing = 7;
    public const int DefaultGenresDescriptionSpacing = 12;
    public const int DefaultDescriptionButtonSpacing = 18;
    public const string DefaultBackdropFit = "Cover";
    public const int DefaultBackdropFocusX = 50;
    public const int DefaultBackdropFocusY = 24;
    public const int DefaultBackdropOpacity = 100;
    public const int DefaultSideShading = 84;
    public const int DefaultBottomFade = 100;
    public const int DefaultFadeHeight = 50;
    public const int DefaultBackdropBlur = 0;
    public const bool DefaultTrailerBackgroundEnabled = false;
    public const double DefaultTrailerStartDelaySeconds = 2.5;
    public const string DefaultTrailerAudio = "Muted";
    public const string DefaultTrailerEndBehavior = "Artwork";
    public const bool DefaultBackdropPauseEnabled = true;
    public const string DefaultTitleTreatment = "Auto";
    public const bool DefaultShowTitle = true;
    public const int DefaultDesktopLogoMaxWidth = 340;
    public const int DefaultMobileLogoMaxWidth = 300;
    public const int DefaultDesktopLogoHeight = 96;
    public const int DefaultMobileLogoHeight = 84;
    public const int DefaultDesktopTitleSize = 48;
    public const int DefaultMobileTitleSize = 36;
    public const int DefaultTitleWeight = 800;
    public const string DefaultTitleCase = "Uppercase";
    public const string DefaultTitleColor = "#FFFFFF";
    public const int DefaultTitleLineHeight = 95;
    public const int DefaultTitleLetterSpacing = -3;
    public const int DefaultTitleShadow = 45;
    public const string DefaultOriginalTitleMode = "Auto";
    public const int DefaultOriginalTitleSize = 14;
    public const string DefaultOriginalTitleColor = "Theme muted";
    public const bool DefaultShowParentTitle = true;
    public const int DefaultParentTitleSize = 11;
    public const string DefaultParentTitleColor = "rgba(255, 255, 255, 0.68)";
    public const int DefaultDesktopChildHeadingSize = 26;
    public const int DefaultMobileChildHeadingSize = 21;
    public const int DefaultChildHeadingWeight = 700;
    public const int DefaultChildHeadingLines = 2;
    public const string DefaultChildHeadingColor = "#FFFFFF";
    public const bool DefaultShowRating = true;
    public const bool DefaultShowYear = true;
    public const bool DefaultShowRuntime = true;
    public const bool DefaultShowCertification = true;
    public const bool DefaultShowAudioLanguages = true;
    public const bool DefaultShowGenres = true;
    public const int DefaultDesktopMetadataSize = 14;
    public const int DefaultMobileMetadataSize = 13;
    public const int DefaultMetadataWeight = 500;
    public const string DefaultMetadataColor = "rgba(255, 255, 255, 0.92)";
    public const string DefaultRatingColor = "Theme accent";
    public const string DefaultGenresColor = "rgba(255, 255, 255, 0.78)";
    public const string DefaultFactSeparator = "Dot";
    public const bool DefaultShowDescription = true;
    public const int DefaultDesktopDescriptionSize = 14;
    public const int DefaultMobileDescriptionSize = 13;
    public const int DefaultDescriptionWidth = 520;
    public const int DefaultDescriptionLines = 3;
    public const string DefaultDescriptionColor = "rgba(255, 255, 255, 0.88)";
    public const int DefaultDescriptionWeight = 400;
    public const int DefaultDescriptionLineHeight = 145;
    public const bool DefaultDescriptionExpandEnabled = true;
    public const int DefaultDesktopButtonHeight = 44;
    public const int DefaultMobileButtonHeight = 40;
    public const int DefaultButtonSpacing = 12;
    public const string DefaultButtonContent = "Default";
    public const string DefaultButtonCornerStyle = "Pill";
    public const string DefaultIconButtonCornerStyle = "Circle";
    public const string DefaultPrimaryButtonBackgroundColor = "#F1F2F4";
    public const string DefaultPrimaryButtonTextColor = "#05070A";
    public const int DefaultPrimaryButtonOpacity = 100;
    public const string DefaultSecondaryButtonBackgroundColor = "#161618";
    public const string DefaultSecondaryButtonTextColor = "#F1F2F4";
    public const int DefaultSecondaryButtonOpacity = 82;
    public const int DefaultDesktopPlayIconSize = 22;
    public const int DefaultMobilePlayIconSize = 20;
    public const int DefaultButtonBlur = 18;
    public const int DefaultControlIconSize = 18;
    public const int DefaultExternalIconSize = 22;
    public const int DefaultButtonHoverOpacity = 100;
    public const int DefaultButtonHoverLift = 0;
    public const string DefaultButtonActiveColor = "Theme accent";
    public const string DefaultMobileActionGroups = "Stack";
    public const string DefaultButtonOverflow = "Wrap";
    public const int DefaultInfoPanelMaxWidth = 560;
    public const bool DefaultShowVersionPicker = true;
    public const bool DefaultShowVideoDetails = true;
    public const bool DefaultShowAudioPicker = true;
    public const bool DefaultShowSubtitlePicker = true;
    public const bool DefaultShowItemMetadata = true;
    public const bool DefaultShowExternalLinks = true;
    public const string DefaultLeftActions = "play,replay,download,favorite,trailer,je:letterboxd,je:seerr";
    public const string DefaultRightActions = "watched,info,more";
    public const string DefaultHiddenActions = "shuffle,splitVersions,je:radarr,je:sonarr,je:bazarr,je:hide,je:spoiler,je:report,je:request-more";

    private static readonly string[] ContentAlignmentOptions = ["Left", "Center", "Right"];
    private static readonly string[] VerticalAlignmentOptions = ["Top", "Center", "Bottom"];
    private static readonly string[] BackdropFitOptions = ["Cover", "Contain"];
    private static readonly string[] TrailerAudioOptions = ["Muted", "Sound"];
    private static readonly string[] TrailerEndBehaviorOptions = ["Artwork", "Loop"];
    private static readonly string[] TitleTreatmentOptions = ["Auto", "Logo", "Text"];
    private static readonly string[] TitleCaseOptions = ["Original", "Uppercase"];
    private static readonly string[] OriginalTitleModeOptions = ["Auto", "Hide"];
    private static readonly string[] FactSeparatorOptions = ["Dot", "None"];
    private static readonly string[] ButtonContentOptions = ["Default", "Icons", "Labels"];
    private static readonly string[] ButtonCornerStyleOptions = ["Square", "Rounded", "Pill"];
    private static readonly string[] IconButtonCornerStyleOptions = ["Square", "Rounded", "Circle"];
    private static readonly string[] MobileActionGroupsOptions = ["Inline", "Stack"];
    private static readonly string[] ButtonOverflowOptions = ["Wrap", "More"];
    private static readonly string[] NativeActions = ["play", "replay", "download", "favorite", "trailer", "shuffle", "watched", "info", "more", "splitVersions"];

    public static void Normalize(PluginConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        configuration.DetailsDesktopHeight = Math.Clamp(configuration.DetailsDesktopHeight, 40, 100);
        configuration.DetailsMobileHeight = Math.Clamp(configuration.DetailsMobileHeight, 40, 100);
        configuration.DetailsMobileMinHeight = Math.Clamp(configuration.DetailsMobileMinHeight, 240, 1200);
        configuration.DetailsContentAlignment = NormalizeOption(configuration.DetailsContentAlignment, ContentAlignmentOptions, DefaultContentAlignment);
        configuration.DetailsVerticalAlignment = NormalizeOption(configuration.DetailsVerticalAlignment, VerticalAlignmentOptions, DefaultVerticalAlignment);
        configuration.DetailsDesktopSideInset = NormalizeLength(configuration.DetailsDesktopSideInset, 240, DefaultDesktopSideInset);
        configuration.DetailsMobileSideInset = NormalizeLength(configuration.DetailsMobileSideInset, 240, DefaultMobileSideInset);
        configuration.DetailsDesktopBottomSpacing = Math.Clamp(configuration.DetailsDesktopBottomSpacing, 0, 240);
        configuration.DetailsMobileBottomSpacing = Math.Clamp(configuration.DetailsMobileBottomSpacing, 0, 240);
        configuration.DetailsContentMaxWidth = Math.Clamp(configuration.DetailsContentMaxWidth, 280, 1600);
        configuration.DetailsButtonGroupSpacing = NormalizeLength(configuration.DetailsButtonGroupSpacing, 480, DefaultButtonGroupSpacing);
        configuration.DetailsTitleMetadataSpacing = Math.Clamp(configuration.DetailsTitleMetadataSpacing, 0, 128);
        configuration.DetailsMetadataGenresSpacing = Math.Clamp(configuration.DetailsMetadataGenresSpacing, 0, 128);
        configuration.DetailsGenresDescriptionSpacing = Math.Clamp(configuration.DetailsGenresDescriptionSpacing, 0, 128);
        configuration.DetailsDescriptionButtonSpacing = Math.Clamp(configuration.DetailsDescriptionButtonSpacing, 0, 128);
        configuration.DetailsBackdropFit = NormalizeOption(configuration.DetailsBackdropFit, BackdropFitOptions, DefaultBackdropFit);
        configuration.DetailsBackdropFocusX = Math.Clamp(configuration.DetailsBackdropFocusX, 0, 100);
        configuration.DetailsBackdropFocusY = Math.Clamp(configuration.DetailsBackdropFocusY, 0, 100);
        configuration.DetailsBackdropOpacity = Math.Clamp(configuration.DetailsBackdropOpacity, 0, 100);
        configuration.DetailsSideShading = Math.Clamp(configuration.DetailsSideShading, 0, 100);
        configuration.DetailsBottomFade = Math.Clamp(configuration.DetailsBottomFade, 0, 100);
        configuration.DetailsFadeHeight = Math.Clamp(configuration.DetailsFadeHeight, 0, 100);
        configuration.DetailsBackdropBlur = Math.Clamp(configuration.DetailsBackdropBlur, 0, 48);
        configuration.DetailsTrailerStartDelaySeconds = double.IsFinite(configuration.DetailsTrailerStartDelaySeconds) ? Math.Clamp(configuration.DetailsTrailerStartDelaySeconds, 0, 60) : DefaultTrailerStartDelaySeconds;
        configuration.DetailsTrailerAudio = NormalizeOption(configuration.DetailsTrailerAudio, TrailerAudioOptions, DefaultTrailerAudio);
        configuration.DetailsTrailerEndBehavior = NormalizeOption(configuration.DetailsTrailerEndBehavior, TrailerEndBehaviorOptions, DefaultTrailerEndBehavior);
        configuration.DetailsTitleTreatment = NormalizeOption(configuration.DetailsTitleTreatment, TitleTreatmentOptions, DefaultTitleTreatment);
        configuration.DetailsDesktopLogoMaxWidth = Math.Clamp(configuration.DetailsDesktopLogoMaxWidth, 80, 1000);
        configuration.DetailsMobileLogoMaxWidth = Math.Clamp(configuration.DetailsMobileLogoMaxWidth, 80, 800);
        configuration.DetailsDesktopLogoHeight = Math.Clamp(configuration.DetailsDesktopLogoHeight, 24, 320);
        configuration.DetailsMobileLogoHeight = Math.Clamp(configuration.DetailsMobileLogoHeight, 24, 240);
        configuration.DetailsDesktopTitleSize = Math.Clamp(configuration.DetailsDesktopTitleSize, 16, 120);
        configuration.DetailsMobileTitleSize = Math.Clamp(configuration.DetailsMobileTitleSize, 16, 96);
        configuration.DetailsTitleWeight = NormalizeWeight(configuration.DetailsTitleWeight, DefaultTitleWeight);
        configuration.DetailsTitleCase = NormalizeOption(configuration.DetailsTitleCase, TitleCaseOptions, DefaultTitleCase);
        configuration.DetailsTitleColor = NormalizeColor(configuration.DetailsTitleColor, DefaultTitleColor);
        configuration.DetailsTitleLineHeight = Math.Clamp(configuration.DetailsTitleLineHeight, 50, 200);
        configuration.DetailsTitleLetterSpacing = Math.Clamp(configuration.DetailsTitleLetterSpacing, -10, 20);
        configuration.DetailsTitleShadow = Math.Clamp(configuration.DetailsTitleShadow, 0, 100);
        configuration.DetailsOriginalTitleMode = NormalizeOption(configuration.DetailsOriginalTitleMode, OriginalTitleModeOptions, DefaultOriginalTitleMode);
        configuration.DetailsOriginalTitleSize = Math.Clamp(configuration.DetailsOriginalTitleSize, 8, 40);
        configuration.DetailsOriginalTitleColor = NormalizeColor(configuration.DetailsOriginalTitleColor, DefaultOriginalTitleColor);
        configuration.DetailsParentTitleSize = Math.Clamp(configuration.DetailsParentTitleSize, 8, 32);
        configuration.DetailsParentTitleColor = NormalizeColor(configuration.DetailsParentTitleColor, DefaultParentTitleColor);
        configuration.DetailsDesktopChildHeadingSize = Math.Clamp(configuration.DetailsDesktopChildHeadingSize, 12, 96);
        configuration.DetailsMobileChildHeadingSize = Math.Clamp(configuration.DetailsMobileChildHeadingSize, 12, 72);
        configuration.DetailsChildHeadingWeight = NormalizeWeight(configuration.DetailsChildHeadingWeight, DefaultChildHeadingWeight);
        configuration.DetailsChildHeadingLines = Math.Clamp(configuration.DetailsChildHeadingLines, 1, 6);
        configuration.DetailsChildHeadingColor = NormalizeColor(configuration.DetailsChildHeadingColor, DefaultChildHeadingColor);
        configuration.DetailsDesktopMetadataSize = Math.Clamp(configuration.DetailsDesktopMetadataSize, 8, 32);
        configuration.DetailsMobileMetadataSize = Math.Clamp(configuration.DetailsMobileMetadataSize, 8, 32);
        configuration.DetailsMetadataWeight = NormalizeWeight(configuration.DetailsMetadataWeight, DefaultMetadataWeight);
        configuration.DetailsMetadataColor = NormalizeColor(configuration.DetailsMetadataColor, DefaultMetadataColor);
        configuration.DetailsRatingColor = NormalizeColor(configuration.DetailsRatingColor, DefaultRatingColor);
        configuration.DetailsGenresColor = NormalizeColor(configuration.DetailsGenresColor, DefaultGenresColor);
        configuration.DetailsFactSeparator = NormalizeOption(configuration.DetailsFactSeparator, FactSeparatorOptions, DefaultFactSeparator);
        configuration.DetailsDesktopDescriptionSize = Math.Clamp(configuration.DetailsDesktopDescriptionSize, 8, 40);
        configuration.DetailsMobileDescriptionSize = Math.Clamp(configuration.DetailsMobileDescriptionSize, 8, 32);
        configuration.DetailsDescriptionWidth = Math.Clamp(configuration.DetailsDescriptionWidth, 240, 1600);
        configuration.DetailsDescriptionLines = Math.Clamp(configuration.DetailsDescriptionLines, 1, 12);
        configuration.DetailsDescriptionColor = NormalizeColor(configuration.DetailsDescriptionColor, DefaultDescriptionColor);
        configuration.DetailsDescriptionWeight = NormalizeWeight(configuration.DetailsDescriptionWeight, DefaultDescriptionWeight);
        configuration.DetailsDescriptionLineHeight = Math.Clamp(configuration.DetailsDescriptionLineHeight, 100, 250);
        configuration.DetailsDesktopButtonHeight = Math.Clamp(configuration.DetailsDesktopButtonHeight, 24, 80);
        configuration.DetailsMobileButtonHeight = Math.Clamp(configuration.DetailsMobileButtonHeight, 24, 80);
        configuration.DetailsButtonSpacing = Math.Clamp(configuration.DetailsButtonSpacing, 0, 48);
        configuration.DetailsButtonContent = NormalizeOption(configuration.DetailsButtonContent, ButtonContentOptions, DefaultButtonContent);
        configuration.DetailsButtonCornerStyle = NormalizeOption(configuration.DetailsButtonCornerStyle, ButtonCornerStyleOptions, DefaultButtonCornerStyle);
        configuration.DetailsIconButtonCornerStyle = NormalizeOption(configuration.DetailsIconButtonCornerStyle, IconButtonCornerStyleOptions, DefaultIconButtonCornerStyle);
        configuration.DetailsPrimaryButtonBackgroundColor = NormalizeColor(configuration.DetailsPrimaryButtonBackgroundColor, DefaultPrimaryButtonBackgroundColor);
        configuration.DetailsPrimaryButtonTextColor = NormalizeColor(configuration.DetailsPrimaryButtonTextColor, DefaultPrimaryButtonTextColor);
        configuration.DetailsPrimaryButtonOpacity = Math.Clamp(configuration.DetailsPrimaryButtonOpacity, 0, 100);
        configuration.DetailsSecondaryButtonBackgroundColor = NormalizeColor(configuration.DetailsSecondaryButtonBackgroundColor, DefaultSecondaryButtonBackgroundColor);
        configuration.DetailsSecondaryButtonTextColor = NormalizeColor(configuration.DetailsSecondaryButtonTextColor, DefaultSecondaryButtonTextColor);
        configuration.DetailsSecondaryButtonOpacity = Math.Clamp(configuration.DetailsSecondaryButtonOpacity, 0, 100);
        configuration.DetailsDesktopPlayIconSize = Math.Clamp(configuration.DetailsDesktopPlayIconSize, 8, 48);
        configuration.DetailsMobilePlayIconSize = Math.Clamp(configuration.DetailsMobilePlayIconSize, 8, 48);
        configuration.DetailsButtonBlur = Math.Clamp(configuration.DetailsButtonBlur, 0, 48);
        configuration.DetailsControlIconSize = Math.Clamp(configuration.DetailsControlIconSize, 8, 48);
        configuration.DetailsExternalIconSize = Math.Clamp(configuration.DetailsExternalIconSize, 8, 48);
        configuration.DetailsButtonHoverOpacity = Math.Clamp(configuration.DetailsButtonHoverOpacity, 0, 100);
        configuration.DetailsButtonHoverLift = Math.Clamp(configuration.DetailsButtonHoverLift, 0, 16);
        configuration.DetailsButtonActiveColor = NormalizeColor(configuration.DetailsButtonActiveColor, DefaultButtonActiveColor);
        configuration.DetailsMobileActionGroups = NormalizeOption(configuration.DetailsMobileActionGroups, MobileActionGroupsOptions, DefaultMobileActionGroups);
        configuration.DetailsButtonOverflow = NormalizeOption(configuration.DetailsButtonOverflow, ButtonOverflowOptions, DefaultButtonOverflow);
        configuration.DetailsInfoPanelMaxWidth = Math.Clamp(configuration.DetailsInfoPanelMaxWidth, 280, 1200);

        IReadOnlyList<string> hidden = GetActions(configuration.DetailsHiddenActions);
        var hiddenSet = new HashSet<string>(hidden, StringComparer.Ordinal);
        IReadOnlyList<string> left = GetActions(configuration.DetailsLeftActions).Where(action => !hiddenSet.Contains(action)).ToArray();
        var leftSet = new HashSet<string>(left, StringComparer.Ordinal);
        configuration.DetailsHiddenActions = string.Join(',', hidden);
        configuration.DetailsLeftActions = string.Join(',', left);
        configuration.DetailsRightActions = string.Join(',', GetActions(configuration.DetailsRightActions).Where(action => !hiddenSet.Contains(action) && !leftSet.Contains(action)));
    }

    public static IReadOnlyList<string> GetActions(string? value)
    {
        var result = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (string candidate in (value ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            string? action = NativeActions.FirstOrDefault(native => string.Equals(native, candidate, StringComparison.OrdinalIgnoreCase));
            if (action is null && candidate.StartsWith("je:", StringComparison.OrdinalIgnoreCase)
                && candidate.Length is > 3 and <= 256
                && candidate.AsSpan(3).ToArray().All(character => char.IsAsciiLetterOrDigit(character) || character is ':' or '-' or '_' or '.' or '%'))
            {
                action = "je:" + candidate[3..];
            }

            if (action is null && candidate.StartsWith("native:btn", StringComparison.Ordinal)
                && candidate.Length is > 10 and <= 256
                && candidate[10] is >= 'A' and <= 'Z'
                && candidate.AsSpan(11).ToArray().All(char.IsAsciiLetterOrDigit))
            {
                action = candidate;
            }

            if (action is not null && seen.Add(action))
            {
                result.Add(action);
            }
        }

        return result;
    }

    private static int NormalizeWeight(int value, int fallback) => value is >= 100 and <= 900 && value % 100 == 0 ? value : fallback;

    private static string NormalizeOption(string? value, IReadOnlyList<string> options, string fallback)
    {
        return options.FirstOrDefault(option => string.Equals(option, value?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? fallback;
    }

    private static string NormalizeLength(string? value, int maximum, string fallback)
    {
        string candidate = value?.Trim() ?? string.Empty;
        if (string.Equals(candidate, "Auto", StringComparison.OrdinalIgnoreCase))
        {
            return "Auto";
        }

        return decimal.TryParse(candidate, NumberStyles.AllowDecimalPoint | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out decimal length)
            ? Math.Round(Math.Clamp(length, 0, maximum), 2, MidpointRounding.AwayFromZero).ToString("0.##", CultureInfo.InvariantCulture)
            : fallback;
    }

    private static string NormalizeColor(string? value, string fallback)
    {
        string candidate = value?.Trim() ?? string.Empty;
        if (string.Equals(candidate, "Theme accent", StringComparison.OrdinalIgnoreCase))
        {
            return "Theme accent";
        }

        if (string.Equals(candidate, "Theme muted", StringComparison.OrdinalIgnoreCase))
        {
            return "Theme muted";
        }

        return HeaderConfiguration.NormalizeColor(candidate, fallback);
    }
}
