using System.Globalization;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;

namespace Jellyfin.Plugin.SleekFin.Helpers;

public static class TransformationPatches
{
    private static readonly Regex InjectedStyles = new(
        "<link\\b[^>]*\\bdata-sleekfin-(?:[a-z]+-)?asset=\"[^\"]*\"[^>]*>|<style\\b[^>]*\\bdata-sleekfin-asset=\"[^\"]*\"[^>]*>[\\s\\S]*?</style>",
        RegexOptions.CultureInvariant);

    // Also removes the earlier inline boot script if Jellyfin transforms content more than once.
    private static readonly Regex InjectedScripts = new(
        "<script\\b[^>]*\\bdata-sleekfin-(?:(?:[a-z]+-)?asset=\"[^\"]*\"|boot\\b)[^>]*>[\\s\\S]*?</script>",
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
                : $"<script{(asset.IsBlockingScript ? string.Empty : " defer")} src=\"{url}\" data-sleekfin-asset=\"{asset.FileName}\"></script>";
            string closingTag = asset.IsStyle || asset.IsBlockingScript ? "</head>" : "</body>";
            contents = contents.Replace(closingTag, $"{element}{closingTag}", StringComparison.Ordinal);
        }

        string cardButtonRadius = ShapeRadius(configuration.CardButtonShape, 4, 12);
        string cardPlayRadius = ShapeRadius(configuration.PlayButtonShape, 6, 18);
        string cardRadius = ShapeRadius(configuration.MediaCardShape, 4, 10);
        string cardInnerRadius = ShapeRadius(configuration.MediaCardShape, 3, 9);
        string compactCardRadius = ShapeRadius(configuration.MediaCardShape, 4, 16);
        string personRadius = ShapeRadius(configuration.CastCrewShape, 4, 10);
        string personInnerRadius = ShapeRadius(configuration.CastCrewShape, 3, 9);
        contents = contents.Replace("</head>", $"<style data-sleekfin-asset=\"accent-color\">html.sleekfin-main-ui:root{{--sleekfin-accent:{configuration.AccentColor};--sleekfin-card-button-radius:{cardButtonRadius};--sleekfin-card-play-radius:{cardPlayRadius};--sleekfin-card-radius:{cardRadius};--sleekfin-card-inner-radius:{cardInnerRadius};--sleekfin-compact-card-radius:{compactCardRadius};--sleekfin-person-radius:{personRadius};--sleekfin-person-inner-radius:{personInnerRadius};}}</style></head>", StringComparison.Ordinal);

        contents = contents.Replace("</head>", $"{CreateBootScript(configuration)}</head>", StringComparison.Ordinal);

        return contents;
    }

    private static string CreateBootScript(PluginConfiguration configuration)
    {
        string headerEnabled = configuration.HeaderEnabled ? "true" : "false";
        string heroEnabled = configuration.HeroEnabled ? "true" : "false";
        string headerHeight = configuration.HeaderHeight.ToString(CultureInfo.InvariantCulture);
        string heroMobileHeight = configuration.HeroMobileHeight.ToString(CultureInfo.InvariantCulture);
        string heroDesktopHeight = configuration.HeroDesktopHeight.ToString(CultureInfo.InvariantCulture);
        return $"<script data-sleekfin-boot>(function(){{'use strict';var r=document.documentElement,t=(location.hash.slice(1)||location.pathname+location.search).replace(/^!+/,''),i=t.search(/[?&]/),p=(i<0?t:t.slice(0,i)).replace(/^[!\\/]+/,'/').replace(/\\/+$/,'')||'/',d=p==='/dashboard'||p.indexOf('/dashboard/')===0||p==='/configurationpage'||p==='/metadata'||p==='/video';r.dataset.sleekfinHeaderEnabled='{headerEnabled}';r.dataset.sleekfinHeroEnabled='{heroEnabled}';r.dataset.sleekfinMediaCardShape='{configuration.MediaCardShape}';r.dataset.sleekfinCastCrewShape='{configuration.CastCrewShape}';r.style.setProperty('--sleekfin-header-height','{headerHeight}px');r.style.setProperty('--sleekfin-hero-mobile-height','{heroMobileHeight}vh');r.style.setProperty('--sleekfin-hero-desktop-height','{heroDesktopHeight}vh');if({headerEnabled}&&!d)r.classList.add('sleekfin-header-boot-loading');if({heroEnabled}&&!/[?&]seerrfinTab=[^&]+/.test(t)&&(p==='/'||/(^|\\/)home\\/?$/.test(p)))r.classList.add('sleekfin-hero-boot-loading');if({headerEnabled}||{heroEnabled})setTimeout(function(){{r.classList.remove('sleekfin-header-boot-loading','sleekfin-hero-boot-loading');}},4000);}})();</script>";
    }

    // Browsers scale oversized radii down to half the shortest side, so Circle stays round on square artwork and becomes a capsule on posters.
    private static string ShapeRadius(string shape, int square, int squircle) => shape switch
    {
        "Square" => $"{square.ToString(CultureInfo.InvariantCulture)}px",
        "Circle" => "9999px",
        _ => $"{squircle.ToString(CultureInfo.InvariantCulture)}px"
    };

    private static bool ShouldInject(FrontendAssets.Asset asset, PluginConfiguration configuration)
    {
        return asset.RequiredFeature switch
        {
            FrontendAssets.Feature.Hero => true,
            FrontendAssets.Feature.Details => configuration.DetailsEnabled,
            _ => true
        };
    }
}
