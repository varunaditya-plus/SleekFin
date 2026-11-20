namespace Jellyfin.Plugin.SleekFin.Configuration;

internal static class HeroConfiguration
{
    public const int DefaultSlidesShown = 5;
    public const int UnlimitedSlides = -1;
    public const int MaxSlidesShown = 10;
    public const string DefaultContentAlignment = "Left";
    public const string DefaultVerticalAlignment = "Bottom";
    public const int DefaultMobileHeight = 70;
    public const int DefaultDesktopHeight = 85;
    public const int DefaultContentMaxWidth = 560;
    public const string DefaultTitleTreatment = "Auto";
    public const string DefaultBackdropFit = "Cover";
    public const int DefaultBackdropFocusX = 50;
    public const int DefaultBackdropFocusY = 28;
    public const int DefaultBackdropOpacity = 100;
    public const int DefaultTitleSize = 48;
    public const int DefaultTitleWeight = 800;
    public const string DefaultTitleCase = "Uppercase";
    public const int DefaultDescriptionSize = 15;
    public const int DefaultDescriptionWeight = 400;
    public const string DefaultDescriptionColor = "rgba(255, 255, 255, 0.88)";
    public const int DefaultDescriptionLines = 3;
    public const string DefaultTitleColor = "#FFFFFF";
    public const int DefaultButtonHeight = 44;
    public const string DefaultPrimaryButtonBackgroundColor = "#F1F2F4";
    public const string DefaultPrimaryButtonTextColor = "#05070A";
    public const int DefaultPrimaryButtonOpacity = 100;
    public const string DefaultSecondaryButtonBackgroundColor = "#161618";
    public const int DefaultSecondaryButtonOpacity = 82;
    public const string DefaultButtonCornerStyle = "Pill";
    public const string DefaultSecondaryButtonTextColor = "#F1F2F4";
    public const int DefaultAutoRotateSeconds = 10;
    public const string DefaultTransitionStyle = "SlideFade";
    public const int DefaultTransitionDurationMs = 380;
    public const bool DefaultSwipeEnabled = true;
    public const int DefaultVignetteStrength = 72;

    private static readonly string[] ContentAlignments = ["Left", "Center", "Right"];
    private static readonly string[] VerticalAlignments = ["Top", "Center", "Bottom"];
    private static readonly string[] TitleTreatments = ["Auto", "Logo", "Text"];
    private static readonly string[] BackdropFits = ["Cover", "Contain"];
    private static readonly string[] TitleCases = ["Original", "Uppercase"];
    private static readonly string[] ButtonCornerStyles = ["Pill", "Rounded", "Square"];
    private static readonly string[] TransitionStyles = ["SlideFade", "Fade", "Slide"];

    public static void Normalize(PluginConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        configuration.HeroContentOrder = string.Join(',', HeroContentOrder.Normalize(configuration.HeroContentOrder));
        configuration.HeroSlidesShown = NormalizeSlidesShown(configuration.HeroSlidesShown);
        configuration.HeroContentAlignment = NormalizeOption(configuration.HeroContentAlignment, ContentAlignments, DefaultContentAlignment);
        configuration.HeroVerticalAlignment = NormalizeOption(configuration.HeroVerticalAlignment, VerticalAlignments, DefaultVerticalAlignment);
        configuration.HeroMobileHeight = Math.Clamp(configuration.HeroMobileHeight, 40, 100);
        configuration.HeroDesktopHeight = Math.Clamp(configuration.HeroDesktopHeight, 40, 100);
        configuration.HeroContentMaxWidth = Math.Clamp(configuration.HeroContentMaxWidth, 280, 1200);
        configuration.HeroTitleTreatment = NormalizeOption(configuration.HeroTitleTreatment, TitleTreatments, DefaultTitleTreatment);
        configuration.HeroBackdropFit = NormalizeOption(configuration.HeroBackdropFit, BackdropFits, DefaultBackdropFit);
        configuration.HeroBackdropFocusX = Math.Clamp(configuration.HeroBackdropFocusX, 0, 100);
        configuration.HeroBackdropFocusY = Math.Clamp(configuration.HeroBackdropFocusY, 0, 100);
        configuration.HeroBackdropOpacity = Math.Clamp(configuration.HeroBackdropOpacity, 0, 100);
        configuration.HeroTitleSize = Math.Clamp(configuration.HeroTitleSize, 16, 96);
        configuration.HeroTitleWeight = configuration.HeroTitleWeight is >= 100 and <= 900 && configuration.HeroTitleWeight % 100 == 0
            ? configuration.HeroTitleWeight
            : DefaultTitleWeight;
        configuration.HeroTitleCase = NormalizeOption(configuration.HeroTitleCase, TitleCases, DefaultTitleCase);
        configuration.HeroDescriptionSize = Math.Clamp(configuration.HeroDescriptionSize, 10, 32);
        configuration.HeroDescriptionWeight = configuration.HeroDescriptionWeight is >= 100 and <= 900 && configuration.HeroDescriptionWeight % 100 == 0
            ? configuration.HeroDescriptionWeight
            : DefaultDescriptionWeight;
        configuration.HeroDescriptionColor = HeaderConfiguration.NormalizeColor(configuration.HeroDescriptionColor, DefaultDescriptionColor);
        configuration.HeroDescriptionLines = Math.Clamp(configuration.HeroDescriptionLines, 1, 8);
        configuration.HeroTitleColor = HeaderConfiguration.NormalizeColor(configuration.HeroTitleColor, DefaultTitleColor);
        configuration.HeroButtonHeight = Math.Clamp(configuration.HeroButtonHeight, 32, 72);
        configuration.HeroPrimaryButtonBackgroundColor = HeaderConfiguration.NormalizeColor(configuration.HeroPrimaryButtonBackgroundColor, DefaultPrimaryButtonBackgroundColor);
        configuration.HeroPrimaryButtonTextColor = HeaderConfiguration.NormalizeColor(configuration.HeroPrimaryButtonTextColor, DefaultPrimaryButtonTextColor);
        configuration.HeroPrimaryButtonOpacity = Math.Clamp(configuration.HeroPrimaryButtonOpacity, 0, 100);
        configuration.HeroSecondaryButtonBackgroundColor = HeaderConfiguration.NormalizeColor(configuration.HeroSecondaryButtonBackgroundColor, DefaultSecondaryButtonBackgroundColor);
        configuration.HeroSecondaryButtonOpacity = Math.Clamp(configuration.HeroSecondaryButtonOpacity, 0, 100);
        configuration.HeroButtonCornerStyle = NormalizeOption(configuration.HeroButtonCornerStyle, ButtonCornerStyles, DefaultButtonCornerStyle);
        configuration.HeroSecondaryButtonTextColor = HeaderConfiguration.NormalizeColor(configuration.HeroSecondaryButtonTextColor, DefaultSecondaryButtonTextColor);
        configuration.HeroAutoRotateSeconds = Math.Clamp(configuration.HeroAutoRotateSeconds, 1, 120);
        configuration.HeroTransitionStyle = NormalizeOption(configuration.HeroTransitionStyle, TransitionStyles, DefaultTransitionStyle);
        configuration.HeroTransitionDurationMs = Math.Clamp(configuration.HeroTransitionDurationMs, 100, 2000);
        configuration.HeroVignetteStrength = Math.Clamp(configuration.HeroVignetteStrength, 0, 100);
    }

    public static int NormalizeSlidesShown(int value)
    {
        return value == UnlimitedSlides ? value : Math.Clamp(value, 1, MaxSlidesShown);
    }

    private static string NormalizeOption(string? value, IReadOnlyList<string> allowedValues, string fallback)
    {
        string? normalized = allowedValues.FirstOrDefault(allowedValue => string.Equals(allowedValue, value?.Trim(), StringComparison.OrdinalIgnoreCase));
        return normalized ?? fallback;
    }
}
