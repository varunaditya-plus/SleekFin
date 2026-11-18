using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Services;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SleekFin.Controllers;

[ApiController]
[Route("SleekFin/Hero")]
[Authorize]
public sealed class SleekFinHeroController(UserSettingsService settings, IAuthorizationContext authorization) : ControllerBase
{
    [HttpGet("Settings")]
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
            enabled = configuration.HeroEnabled,
            contentOrder = HeroContentOrder.Normalize(configuration.HeroContentOrder),
            randomized = configuration.HeroRandomized,
            slidesShown = configuration.HeroSlidesShown,
            contentAlignment = configuration.HeroContentAlignment,
            verticalAlignment = configuration.HeroVerticalAlignment,
            mobileHeight = configuration.HeroMobileHeight,
            desktopHeight = configuration.HeroDesktopHeight,
            contentMaxWidth = configuration.HeroContentMaxWidth,
            titleTreatment = configuration.HeroTitleTreatment,
            backdropFit = configuration.HeroBackdropFit,
            backdropFocusX = configuration.HeroBackdropFocusX,
            backdropFocusY = configuration.HeroBackdropFocusY,
            backdropOpacity = configuration.HeroBackdropOpacity,
            titleSize = configuration.HeroTitleSize,
            titleWeight = configuration.HeroTitleWeight,
            titleCase = configuration.HeroTitleCase,
            descriptionSize = configuration.HeroDescriptionSize,
            descriptionWeight = configuration.HeroDescriptionWeight,
            descriptionColor = configuration.HeroDescriptionColor,
            descriptionLines = configuration.HeroDescriptionLines,
            titleColor = configuration.HeroTitleColor,
            buttonHeight = configuration.HeroButtonHeight,
            primaryButtonBackgroundColor = configuration.HeroPrimaryButtonBackgroundColor,
            primaryButtonTextColor = configuration.HeroPrimaryButtonTextColor,
            primaryButtonOpacity = configuration.HeroPrimaryButtonOpacity,
            secondaryButtonBackgroundColor = configuration.HeroSecondaryButtonBackgroundColor,
            secondaryButtonOpacity = configuration.HeroSecondaryButtonOpacity,
            buttonCornerStyle = configuration.HeroButtonCornerStyle,
            secondaryButtonTextColor = configuration.HeroSecondaryButtonTextColor,
            autoRotateSeconds = configuration.HeroAutoRotateSeconds,
            transitionStyle = configuration.HeroTransitionStyle,
            transitionDurationMs = configuration.HeroTransitionDurationMs,
            swipeEnabled = configuration.HeroSwipeEnabled,
            vignetteStrength = configuration.HeroVignetteStrength
        });
    }
}
