using System.Text.Json;
using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.SleekFin.Services;

public sealed class HeaderCatalogService(IDisplayPreferencesManager preferences, IUserManager users, ILogger<HeaderCatalogService> logger)
{
    private static readonly Guid PreferencesId = Guid.Parse("e03a884a-b217-4a98-978b-9e59847e67df");
    private const string Client = "SleekFin";
    private const string ItemsKey = "HeaderCatalog";
    private const int MaxItems = 256;
    private readonly Lock _writeLock = new();

    public IReadOnlyList<HeaderCatalogItem> Get(CancellationToken cancellationToken)
    {
        var items = new Dictionary<string, HeaderCatalogItem>(StringComparer.Ordinal);
        foreach (Guid userId in users.GetUsersIds().Order())
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (HeaderCatalogItem item in Read(userId))
            {
                items.TryAdd(item.Id, item);
            }
        }

        return items.Values.OrderBy(item => item.Caption, StringComparer.OrdinalIgnoreCase).ThenBy(item => item.Id, StringComparer.Ordinal).ToArray();
    }

    public bool TrySave(Guid userId, IReadOnlyList<HeaderCatalogItem> items, CancellationToken cancellationToken)
    {
        if (items.Count is 0 or > MaxItems || items.Any(item => !IsValid(item)))
        {
            return false;
        }

        // Jellyfin's synchronous preferences API replaces the entire set, so merge observations under one lock.
        lock (_writeLock)
        {
            cancellationToken.ThrowIfCancellationRequested();
            HeaderCatalogItem[] stored = Read(userId);
            HeaderCatalogItem[] merged = items.Concat(stored).DistinctBy(item => item.Id, StringComparer.Ordinal).Take(MaxItems).ToArray();
            if (!merged.SequenceEqual(stored))
            {
                preferences.SetCustomItemDisplayPreferences(userId, PreferencesId, Client, new Dictionary<string, string?>
                {
                    [ItemsKey] = JsonSerializer.Serialize(merged)
                });
            }
        }

        return true;
    }

    private HeaderCatalogItem[] Read(Guid userId)
    {
        string? json = preferences.ListCustomItemDisplayPreferences(userId, PreferencesId, Client).GetValueOrDefault(ItemsKey);
        if (string.IsNullOrEmpty(json))
        {
            return [];
        }

        try
        {
            return (JsonSerializer.Deserialize<HeaderCatalogItem[]>(json) ?? []).Where(IsValid).Take(MaxItems).ToArray();
        }
        catch (JsonException)
        {
            logger.LogWarning("Ignoring malformed SleekFin header catalog preferences");
            return [];
        }
    }

    private static bool IsValid(HeaderCatalogItem? item)
        => item?.Id is { Length: > 0 and <= 80 } id
            && id is not ("space" or "separator")
            && HeaderConfiguration.IsItemId(id)
            && IsLabel(item.Label)
            && IsLabel(item.Caption);

    private static bool IsLabel(string? label)
        => label is { Length: > 0 and <= 160 } && !string.IsNullOrWhiteSpace(label) && !label.Any(char.IsControl);
}
