using System.Text.Json;
using System.Text.Json.Serialization;

namespace Jellyfin.Plugin.SleekFin.Model;

public sealed record UserSettingOption([property: JsonPropertyName("value")] string Value, [property: JsonPropertyName("label")] string Label);

public sealed record UserSettingField(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("group")] string Group,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("min")] int Min = 0,
    [property: JsonPropertyName("max")] int Max = 0)
{
    [JsonPropertyName("options")]
    public IReadOnlyList<UserSettingOption> Options { get; init; } = [];
}

public sealed record UserSettingsResponse
{
    [JsonPropertyName("enabled")]
    public required bool Enabled { get; init; }

    [JsonPropertyName("fields")]
    public required IReadOnlyList<UserSettingField> Fields { get; init; }

    [JsonPropertyName("defaults")]
    public required IReadOnlyDictionary<string, object?> Defaults { get; init; }

    [JsonPropertyName("overrides")]
    public required IReadOnlyDictionary<string, object?> Overrides { get; init; }

    [JsonPropertyName("appearance")]
    public required UserAppearance Appearance { get; init; }
}

public sealed record UserAppearance([property: JsonPropertyName("accentColor")] string AccentColor, [property: JsonPropertyName("dropdownStyle")] string DropdownStyle);

public sealed class UserSettingsRequest
{
    [JsonPropertyName("overrides")]
    public Dictionary<string, JsonElement> Overrides { get; set; } = [];
}
