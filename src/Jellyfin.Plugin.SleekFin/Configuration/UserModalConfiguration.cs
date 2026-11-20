using System.Reflection;
using System.Text.Json;
using Jellyfin.Plugin.SleekFin.Model;

namespace Jellyfin.Plugin.SleekFin.Configuration;

internal static class UserModalConfiguration
{
    public static IReadOnlyList<UserSettingField> Fields { get; } =
    [
        new(nameof(PluginConfiguration.HeroEnabled), "Show hero carousel", "Hero carousel", "boolean"),
        new(nameof(PluginConfiguration.HeroContentOrder), "Content sources", "Hero carousel", "sources")
        {
            Options = [new("ContinueWatching", "Continue watching"), new("NextUp", "Next up"), new("LatestMovies", "Latest movies"), new("LatestShows", "Latest shows"), new("Favorites", "Favorites")]
        },
        new(nameof(PluginConfiguration.HeroRandomized), "Shuffle content", "Hero carousel", "boolean"),
        new(nameof(PluginConfiguration.HeroSlidesShown), "Number of slides (-1 for unlimited)", "Hero carousel", "number", HeroConfiguration.UnlimitedSlides, HeroConfiguration.MaxSlidesShown),
        new(nameof(PluginConfiguration.HeroAutoRotateSeconds), "Seconds between slides", "Hero carousel", "number", 1, 120),
        new(nameof(PluginConfiguration.DetailsSeasonPostersEnabled), "Show season posters", "Detail pages", "boolean"),
        new(nameof(PluginConfiguration.DetailsCompactEpisodeGridCardsEnabled), "Compact episode cards", "Detail pages", "boolean"),
        new(nameof(PluginConfiguration.DetailsTrailerBackgroundEnabled), "Play background trailers", "Detail pages", "boolean"),
        new(nameof(PluginConfiguration.HeaderEnabled), "Show SleekFin header", "Appearance", "boolean"),
        new(nameof(PluginConfiguration.AccentColor), "Accent color", "Appearance", "color"),
        new(nameof(PluginConfiguration.DropdownStyle), "Menu style", "Appearance", "select")
        {
            Options = [new("SleekFin", "SleekFin"), new("Jellyfin", "Jellyfin"), new("Native", "Native")]
        }
    ];

    public static string DefaultFields { get; } = string.Join(',', Fields.Select(field => field.Id));

    public static IReadOnlyDictionary<string, PropertyInfo> Properties { get; } = Fields.ToDictionary(field => field.Id, field => typeof(PluginConfiguration).GetProperty(field.Id)!, StringComparer.Ordinal);

    public static IReadOnlyList<UserSettingField> AllowedFields(string? value)
    {
        var allowed = new HashSet<string>((value ?? DefaultFields).Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries), StringComparer.Ordinal);
        return Fields.Where(field => allowed.Contains(field.Id)).ToArray();
    }

    public static void Normalize(PluginConfiguration configuration)
    {
        configuration.UserModalFields = string.Join(',', AllowedFields(configuration.UserModalFields).Select(field => field.Id));
    }

    public static bool TryNormalize(UserSettingField field, JsonElement value, out object? normalized)
    {
        normalized = null;
        if (field.Type == "boolean" && value.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            normalized = value.GetBoolean();
            return true;
        }

        if (field.Type == "number" && value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out int number))
        {
            normalized = field.Id == nameof(PluginConfiguration.HeroSlidesShown)
                ? HeroConfiguration.NormalizeSlidesShown(number)
                : Math.Clamp(number, field.Min, field.Max);
            return true;
        }

        if (value.ValueKind != JsonValueKind.String || value.GetString() is not string text || text.Length > 256)
        {
            return false;
        }

        text = text.Trim();
        switch (field.Type)
        {
            case "select":
                normalized = field.Options.FirstOrDefault(option => string.Equals(option.Value, text, StringComparison.OrdinalIgnoreCase))?.Value;
                return normalized is not null;
            case "sources":
                IReadOnlyList<string> sources = HeroContentOrder.Normalize(text);
                normalized = string.Join(',', sources);
                return sources.Count > 0;
            case "color" when text.Length == 7 && text[0] == '#' && text.Skip(1).All(char.IsAsciiHexDigit):
                normalized = text.ToLowerInvariant();
                return true;
            default:
                return false;
        }
    }
}
