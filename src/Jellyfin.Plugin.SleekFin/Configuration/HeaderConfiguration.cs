using System.Globalization;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.SleekFin.Helpers;

namespace Jellyfin.Plugin.SleekFin.Configuration;

internal static class HeaderConfiguration
{
    public const string DefaultBrandDisplay = "Both";
    public const string DefaultBrandPosition = "Left";
    public const string DefaultBarPosition = "Right";
    public const int DefaultHeight = 80;
    public const int DefaultLogoHeight = 36;
    public const string DefaultServerNameColor = "#FFFFFF";
    public const int DefaultBrandSpacing = 10;
    public const int DefaultItemSpacing = 2;
    public const int DefaultItemHeight = 32;
    public const int DefaultBarPadding = 4;
    public const string DefaultItemBackgroundColor = "transparent";
    public const string DefaultItemTextColor = "rgba(255, 255, 255, 0.7)";
    public const string DefaultActiveItemBackgroundColor = "rgba(255, 255, 255, 0.12)";
    public const string DefaultActiveItemTextColor = "#FFFFFF";
    public const int DefaultHoverOpacity = 100;
    public const int DefaultActiveItemOpacity = 100;

    private static readonly string[] FixedItemIds =
    [
        "space",
        "jellyfin:movies",
        "jellyfin:shows",
        "jellyfin:audio-player",
        "jellyfin:back",
        "jellyfin:cast",
        "jellyfin:collections",
        "jellyfin:favorites",
        "jellyfin:folders",
        "jellyfin:home",
        "jellyfin:live-tv",
        "jellyfin:more",
        "jellyfin:playlists",
        "jellyfin:search",
        "jellyfin:syncplay",
        "jellyfin:user-menu",
        "separator"
    ];

    private static readonly string[] BrandDisplays = ["None", "Logo", "ServerName", "Both"];
    private static readonly string[] Positions = ["Left", "Center", "Right"];

    private static readonly Lazy<IReadOnlyList<string>> EmbeddedStyles = new(() =>
        FrontendAssets.HeaderStyles.Select(asset =>
        {
            using var stream = typeof(SleekFinPlugin).Assembly.GetManifestResourceStream(asset.ResourceName)
                ?? throw new InvalidOperationException($"Missing header stylesheet {asset.ResourceName}.");
            using var reader = new StreamReader(stream);
            return reader.ReadToEnd();
        }).ToArray());

    public static IReadOnlyList<string> DefaultStyles => EmbeddedStyles.Value;

    public static void Normalize(PluginConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        IReadOnlyList<string> hiddenItems = GetItems(configuration.HeaderHiddenItems);
        var hiddenSet = new HashSet<string>(hiddenItems, StringComparer.Ordinal);
        configuration.HeaderHiddenItems = string.Join(',', hiddenItems);
        configuration.HeaderItemOrder = string.Join(',', GetItems(configuration.HeaderItemOrder, preserveDuplicates: true).Where(item => !hiddenSet.Contains(item)));
        configuration.HeaderBrandDisplay = NormalizeOption(configuration.HeaderBrandDisplay, BrandDisplays, DefaultBrandDisplay);
        configuration.HeaderBrandPosition = NormalizeOption(configuration.HeaderBrandPosition, Positions, DefaultBrandPosition);
        configuration.HeaderBarPosition = NormalizeOption(configuration.HeaderBarPosition, Positions, DefaultBarPosition);
        if (configuration.HeaderBrandStylesheet is not null && configuration.HeaderStylesheet is not null && configuration.HeaderItemStylesheet is not null)
        {
            return;
        }

        int height = Math.Clamp(configuration.HeaderHeight, 48, 160);
        int itemHeight = Math.Clamp(configuration.HeaderItemHeight, 24, Math.Min(80, height));

        configuration.HeaderBrandStylesheet ??= ApplyInputValues(DefaultStyles[0],
            ("Logo height", Pixels(Math.Clamp(configuration.HeaderLogoHeight, 16, Math.Min(96, height)))),
            ("Logo/server name spacing", Pixels(Math.Clamp(configuration.HeaderBrandSpacing, 0, 64))),
            ("Server name text color", NormalizeColor(configuration.HeaderServerNameColor, DefaultServerNameColor)));
        configuration.HeaderStylesheet ??= ApplyInputValues(DefaultStyles[1],
            ("Header height", Pixels(height)),
            ("Header item spacing", Pixels(Math.Clamp(configuration.HeaderItemSpacing, 0, 48))),
            ("Header bar padding", Pixels(Math.Clamp(configuration.HeaderBarPadding, 0, Math.Min(32, (height - itemHeight) / 2)))));
        configuration.HeaderItemStylesheet ??= ApplyInputValues(DefaultStyles[2],
            ("Header item height", Pixels(itemHeight)),
            ("Item background color", NormalizeColor(configuration.HeaderItemBackgroundColor, DefaultItemBackgroundColor)),
            ("Item text color", NormalizeColor(configuration.HeaderItemTextColor, DefaultItemTextColor)),
            ("Active item background color", NormalizeColor(configuration.HeaderActiveItemBackgroundColor, DefaultActiveItemBackgroundColor)),
            ("Active item text color", NormalizeColor(configuration.HeaderActiveItemTextColor, DefaultActiveItemTextColor)),
            ("Hover opacity", Opacity(configuration.HeaderHoverOpacity)),
            ("Active item opacity", Opacity(configuration.HeaderActiveItemOpacity)));
    }

    public static string[] GetStyles(PluginConfiguration configuration) =>
    [
        configuration.HeaderBrandStylesheet ?? DefaultStyles[0],
        configuration.HeaderStylesheet ?? DefaultStyles[1],
        configuration.HeaderItemStylesheet ?? DefaultStyles[2]
    ];

    private static string ApplyInputValues(string stylesheet, params (string Label, string Value)[] inputs)
    {
        foreach ((string label, string value) in inputs)
        {
            string declaration = $@"(?m)^([ \t]+[\w-]+: )[^;\r\n]+(; /\* {Regex.Escape(label)}\.)";
            stylesheet = Regex.Replace(stylesheet, declaration, match => match.Groups[1].Value + value + match.Groups[2].Value);
        }

        return stylesheet;
    }

    private static string Pixels(int value) => FormattableString.Invariant($"{value}px");

    private static string Opacity(int value) => FormattableString.Invariant($"{Math.Clamp(value, 0, 100) / 100m:0.##}");

    public static IReadOnlyList<string> GetItems(string? value, bool preserveDuplicates = false)
    {
        var result = new List<string>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (string item in (value ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            string candidate = item.ToLowerInvariant();
            if (IsItemId(candidate) && (preserveDuplicates || seen.Add(candidate)))
            {
                result.Add(candidate);
            }
        }

        return result;
    }

    internal static bool IsItemId(string value)
    {
        if (FixedItemIds.Contains(value, StringComparer.Ordinal))
        {
            return true;
        }

        if (value.StartsWith("je:", StringComparison.Ordinal) || value.StartsWith("sf:", StringComparison.Ordinal) || value.StartsWith("kt:", StringComparison.Ordinal))
        {
            string slug = value[(value.IndexOf(':') + 1)..];
            return slug.Length is >= 1 and <= 64 && slug.All(character => char.IsAsciiLetterOrDigit(character) || character == '-');
        }

        const string jellyfinViewPrefix = "jellyfin:view:";
        if (value.StartsWith(jellyfinViewPrefix, StringComparison.Ordinal))
        {
            string viewId = value[jellyfinViewPrefix.Length..];
            return viewId.Length is >= 16 and <= 64 && viewId.All(character => Uri.IsHexDigit(character) || character == '-');
        }

        const string sourcePrefix = "source:v1:";
        // Older releases saved Jellyfin Enhanced's three-dot launcher under this source ID.
        return value.StartsWith(sourcePrefix, StringComparison.Ordinal)
            && !string.Equals(value, "source:v1:53f7a696156864b35ecf31acea817af9", StringComparison.Ordinal)
            && value.Length == sourcePrefix.Length + 32
            && value.AsSpan(sourcePrefix.Length).ToArray().All(Uri.IsHexDigit);
    }

    private static string NormalizeOption(string? value, IReadOnlyList<string> allowedValues, string fallback)
    {
        string? normalized = allowedValues.FirstOrDefault(allowedValue => string.Equals(allowedValue, value?.Trim(), StringComparison.OrdinalIgnoreCase));
        return normalized ?? fallback;
    }

    internal static string NormalizeColor(string? value, string fallback)
    {
        string candidate = value?.Trim() ?? string.Empty;
        if (string.Equals(candidate, "transparent", StringComparison.OrdinalIgnoreCase))
        {
            return "transparent";
        }

        if (IsHexColor(candidate))
        {
            return candidate.ToUpperInvariant();
        }

        return TryNormalizeFunctionalColor(candidate, out string normalized) ? normalized : fallback;
    }

    private static bool IsHexColor(string value)
    {
        return value.Length is 4 or 5 or 7 or 9
            && value[0] == '#'
            && value.AsSpan(1).ToArray().All(Uri.IsHexDigit);
    }

    private static bool TryNormalizeFunctionalColor(string value, out string normalized)
    {
        bool hasAlpha;
        if (value.StartsWith("rgba(", StringComparison.OrdinalIgnoreCase) && value.EndsWith(')'))
        {
            hasAlpha = true;
        }
        else if (value.StartsWith("rgb(", StringComparison.OrdinalIgnoreCase) && value.EndsWith(')'))
        {
            hasAlpha = false;
        }
        else
        {
            normalized = string.Empty;
            return false;
        }

        int prefixLength = hasAlpha ? 5 : 4;
        string[] parts = value[prefixLength..^1].Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length != (hasAlpha ? 4 : 3)
            || !TryParseColorComponent(parts[0], out int red)
            || !TryParseColorComponent(parts[1], out int green)
            || !TryParseColorComponent(parts[2], out int blue))
        {
            normalized = string.Empty;
            return false;
        }

        if (!hasAlpha)
        {
            normalized = string.Create(CultureInfo.InvariantCulture, $"rgb({red}, {green}, {blue})");
            return true;
        }

        if (!decimal.TryParse(parts[3], NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, out decimal alpha)
            || alpha < 0
            || alpha > 1)
        {
            normalized = string.Empty;
            return false;
        }

        normalized = string.Create(CultureInfo.InvariantCulture, $"rgba({red}, {green}, {blue}, {alpha:0.###})");
        return true;
    }

    private static bool TryParseColorComponent(string value, out int component)
    {
        return int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out component)
            && component is >= 0 and <= 255;
    }
}
