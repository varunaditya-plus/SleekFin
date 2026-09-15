using System.Text.RegularExpressions;
using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;

namespace Jellyfin.Plugin.SleekFin.Helpers;

public static class TransformationPatches
{
    private static readonly Regex InjectedStyles = new(
        "<link\\b[^>]*\\bdata-sleekfin-(?:[a-z]+-)?asset=\"[^\"]*\"[^>]*>",
        RegexOptions.CultureInvariant);

    private static readonly Regex InjectedScripts = new(
        "<script\\b[^>]*\\bdata-sleekfin-(?:[a-z]+-)?asset=\"[^\"]*\"[^>]*>\\s*</script>",
        RegexOptions.CultureInvariant);

    public static string IndexHtml(PatchRequestPayload payload)
    {
        string contents = payload.Contents ?? string.Empty;
        if (string.IsNullOrEmpty(contents)
            || !contents.Contains("</head>", StringComparison.Ordinal)
            || !contents.Contains("</body>", StringComparison.Ordinal))
        {
            return contents;
        }

        var assembly = typeof(SleekFinPlugin).Assembly;
        string version = assembly.GetName().Version?.ToString() ?? "0.1.0.0";
        string buildId = assembly.ManifestModule.ModuleVersionId.ToString("N");
        string cacheQuery = $"?v={version}&b={buildId}";

        contents = InjectedStyles.Replace(contents, string.Empty);
        contents = InjectedScripts.Replace(contents, string.Empty);

        PluginConfiguration configuration = SleekFinPlugin.Instance.Configuration;
        foreach (FrontendAssets.Asset asset in FrontendAssets.Ordered)
        {
            if (!ShouldInject(asset, configuration))
            {
                continue;
            }

            string url = $"../SleekFin/{asset.FileName}{cacheQuery}";
            string element = asset.IsStyle
                ? $"<link rel=\"stylesheet\" href=\"{url}\" data-sleekfin-asset=\"{asset.FileName}\" />"
                : asset.IsBlockingScript
                    ? $"<script src=\"{url}\" data-sleekfin-asset=\"{asset.FileName}\"></script>"
                    : $"<script defer src=\"{url}\" data-sleekfin-asset=\"{asset.FileName}\"></script>";
            string closingTag = asset.IsStyle || asset.IsBlockingScript ? "</head>" : "</body>";
            contents = contents.Replace(closingTag, $"{element}{closingTag}", StringComparison.Ordinal);
        }

        return contents;
    }

    private static bool ShouldInject(FrontendAssets.Asset asset, PluginConfiguration configuration)
    {
        return asset.RequiredFeature switch
        {
            FrontendAssets.Feature.Header => configuration.HeaderEnabled,
            FrontendAssets.Feature.Hero => configuration.HeroEnabled,
            _ => true
        };
    }
}