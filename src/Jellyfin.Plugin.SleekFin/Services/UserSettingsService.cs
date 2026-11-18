using System.Text.Json;
using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;
using MediaBrowser.Controller;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.SleekFin.Services;

public sealed class UserSettingsService(IDisplayPreferencesManager preferences, Func<PluginConfiguration> configuration, ILogger<UserSettingsService> logger)
{
    private static readonly Guid PreferencesId = Guid.Parse("da36c4ef-1d10-4169-8a68-26b194d5301a");
    private const string Client = "SleekFin";

    public PluginConfiguration GetEffectiveConfiguration(Guid userId)
    {
        PluginConfiguration defaults = configuration();
        PluginConfiguration effective = defaults.Copy();
        foreach ((string key, object? value) in ReadOverrides(userId, UserModalConfiguration.AllowedFields(defaults.UserModalFields)))
        {
            UserModalConfiguration.Properties[key].SetValue(effective, value);
        }

        return effective;
    }

    public UserSettingsResponse Get(Guid userId)
    {
        PluginConfiguration defaults = configuration();
        IReadOnlyList<UserSettingField> fields = UserModalConfiguration.AllowedFields(defaults.UserModalFields);
        Dictionary<string, object?> overrides = ReadOverrides(userId, fields);

        return new UserSettingsResponse
        {
            Fields = fields,
            Defaults = fields.ToDictionary(field => field.Id, field => UserModalConfiguration.Properties[field.Id].GetValue(defaults), StringComparer.Ordinal),
            Overrides = overrides,
            Appearance = new UserAppearance(overrides.GetValueOrDefault(nameof(PluginConfiguration.AccentColor)) as string ?? defaults.AccentColor, overrides.GetValueOrDefault(nameof(PluginConfiguration.DropdownStyle)) as string ?? defaults.DropdownStyle)
        };
    }

    public bool Save(Guid userId, Dictionary<string, JsonElement>? overrides, out string? error)
    {
        error = null;
        PluginConfiguration defaults = configuration();
        IReadOnlyList<UserSettingField> fields = UserModalConfiguration.AllowedFields(defaults.UserModalFields);
        if (overrides is null || overrides.Count > fields.Count)
        {
            error = "Invalid user settings.";
            return false;
        }

        var stored = new Dictionary<string, string?>(StringComparer.Ordinal);
        foreach ((string key, JsonElement value) in overrides)
        {
            UserSettingField? field = fields.FirstOrDefault(field => string.Equals(field.Id, key, StringComparison.Ordinal));
            if (field is null || !UserModalConfiguration.TryNormalize(field, value, out object? normalized))
            {
                error = $"The setting {key} is unavailable or invalid.";
                return false;
            }

            if (!Equals(normalized, UserModalConfiguration.Properties[key].GetValue(defaults)))
            {
                stored[key] = JsonSerializer.Serialize(normalized);
            }
        }

        // Jellyfin 12 exposes this user-scoped database API synchronously and replaces the set transactionally.
        preferences.SetCustomItemDisplayPreferences(userId, PreferencesId, Client, stored);
        return true;
    }

    private Dictionary<string, object?> ReadOverrides(Guid userId, IReadOnlyList<UserSettingField> fields)
    {
        if (fields.Count == 0)
        {
            return [];
        }

        Dictionary<string, string?> stored = preferences.ListCustomItemDisplayPreferences(userId, PreferencesId, Client);
        var result = new Dictionary<string, object?>(StringComparer.Ordinal);
        foreach (UserSettingField field in fields)
        {
            if (!stored.TryGetValue(field.Id, out string? json) || string.IsNullOrEmpty(json))
            {
                continue;
            }

            try
            {
                if (UserModalConfiguration.TryNormalize(field, JsonSerializer.Deserialize<JsonElement>(json), out object? normalized))
                {
                    result[field.Id] = normalized;
                }
                else
                {
                    logger.LogWarning("Ignoring invalid SleekFin user preference {Setting}", field.Id);
                }
            }
            catch (JsonException)
            {
                logger.LogWarning("Ignoring malformed SleekFin user preference {Setting}", field.Id);
            }
        }

        return result;
    }
}
