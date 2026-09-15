namespace Jellyfin.Plugin.SleekFin.Helpers;

public static class FrontendAssets
{
    public enum Feature
    {
        Always,
        Hero,
        Details
    }

    public sealed record Asset(string FileName, string Folder, Feature RequiredFeature = Feature.Always, bool IsBlockingScript = false)
    {
        public bool IsStyle => FileName.EndsWith(".css", StringComparison.Ordinal);

        public string ContentType => IsStyle ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";

        public string ResourceName => $"Jellyfin.Plugin.SleekFin.Inject.{Folder}.{FileName}";
    }

    public static IReadOnlyList<Asset> Ordered { get; } =
    [
        new("sleekfin-fonts.css", "Theme"),
        new("sleekfin-tokens.css", "Theme"),
        new("sleekfin-foundation.css", "Theme"),
        new("sleekfin-control-surface.css", "Components"),
        new("sleekfin-button.css", "Components"),
        new("sleekfin-section-heading.css", "Components"),
        new("sleekfin-fact.css", "Components"),
        new("sleekfin-meta.css", "Components"),
        new("sleekfin-header-shared.css", "Header"),
        new("sleekfin-header-brand.css", "Header"),
        new("sleekfin-header-modern.css", "Header"),
        new("sleekfin-header-legacy.css", "Header"),
        new("sleekfin-hero.css", "Hero", Feature.Hero),
        new("sleekfin-hero-slide.css", "Hero", Feature.Hero),
        new("sleekfin-hero-carousel.css", "Hero", Feature.Hero),
        new("sleekfin-media.css", "Media"),
        new("sleekfin-media-metadata.css", "Media"),
        new("sleekfin-details.css", "Details", Feature.Details),
        new("sleekfin-details-hero.css", "Details", Feature.Details),
        new("sleekfin-details-actions.css", "Details", Feature.Details),
        new("sleekfin-details-sections.css", "Details", Feature.Details),
        new("sleekfin-details-similar.css", "Details", Feature.Details),
        new("sleekfin-details-episodes.css", "Details", Feature.Details),
        new("sleekfin-details-boot.js", "Details", Feature.Details, IsBlockingScript: true),
        new("sleekfin-runtime.js", "Build"),
        new("sleekfin-theme.js", "Build"),
        new("sleekfin-header.js", "Build"),
        new("sleekfin-hero.js", "Build", Feature.Hero),
        new("sleekfin-media.js", "Build"),
        new("sleekfin-details.js", "Build", Feature.Details)
    ];

    public static IReadOnlyDictionary<string, Asset> ByFileName { get; } = Ordered.ToDictionary(
        asset => asset.FileName,
        StringComparer.Ordinal);
}
