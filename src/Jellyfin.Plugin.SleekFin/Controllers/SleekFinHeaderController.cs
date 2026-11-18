using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Services;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SleekFin.Controllers;

[ApiController]
[Route("SleekFin/Header")]
[Authorize]
public sealed class SleekFinHeaderController(UserSettingsService settings, IAuthorizationContext authorization) : ControllerBase
{
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
            height = configuration.HeaderHeight,
            logoHeight = configuration.HeaderLogoHeight,
            serverNameColor = configuration.HeaderServerNameColor,
            brandSpacing = configuration.HeaderBrandSpacing,
            itemSpacing = configuration.HeaderItemSpacing,
            itemHeight = configuration.HeaderItemHeight,
            barPadding = configuration.HeaderBarPadding,
            itemBackgroundColor = configuration.HeaderItemBackgroundColor,
            itemTextColor = configuration.HeaderItemTextColor,
            activeItemBackgroundColor = configuration.HeaderActiveItemBackgroundColor,
            activeItemTextColor = configuration.HeaderActiveItemTextColor,
            hoverOpacity = configuration.HeaderHoverOpacity,
            activeItemOpacity = configuration.HeaderActiveItemOpacity
        });
    }
}
