using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;
using Jellyfin.Plugin.SleekFin.Services;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SleekFin.Controllers;

[ApiController]
[Route("SleekFin/Header")]
[Authorize]
public sealed class SleekFinHeaderController(UserSettingsService settings, HeaderCatalogService catalog, IAuthorizationContext authorization) : ControllerBase
{
    [HttpGet("DefaultStyles")]
    [Authorize(Policy = Policies.RequiresElevation)]
    public ActionResult<IReadOnlyList<string>> GetDefaultStyles() => Ok(HeaderConfiguration.DefaultStyles);

    [HttpGet("Catalog")]
    [Authorize(Policy = Policies.RequiresElevation)]
    public ActionResult<IReadOnlyList<HeaderCatalogItem>> GetCatalog(CancellationToken cancellationToken)
    {
        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(catalog.Get(cancellationToken));
    }

    [HttpPost("Catalog")]
    [RequestSizeLimit(327680)]
    public async Task<IActionResult> ReportCatalog(HeaderCatalogItem[] items, CancellationToken cancellationToken)
    {
        Guid userId = (await authorization.GetAuthorizationInfo(Request).ConfigureAwait(false)).UserId;
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        return catalog.TrySave(userId, items, cancellationToken) ? NoContent() : BadRequest();
    }

    [HttpGet]
    public async Task<ActionResult> GetSettings()
    {
        Guid userId = (await authorization.GetAuthorizationInfo(Request).ConfigureAwait(false)).UserId;
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        PluginConfiguration configuration = settings.GetEffectiveConfiguration(userId);
        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(new
        {
            enabled = configuration.HeaderEnabled,
            itemOrder = HeaderConfiguration.GetItems(configuration.HeaderItemOrder, preserveDuplicates: true),
            hiddenItems = HeaderConfiguration.GetItems(configuration.HeaderHiddenItems),
            brandDisplay = configuration.HeaderBrandDisplay,
            brandPosition = configuration.HeaderBrandPosition,
            barPosition = configuration.HeaderBarPosition,
            styles = HeaderConfiguration.GetStyles(configuration)
        });
    }
}
