using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Model;
using Jellyfin.Plugin.SleekFin.Services;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SleekFin.Controllers;

[ApiController]
[Route("SleekFin/UserSettings")]
[Authorize]
public sealed class SleekFinUserSettingsController(UserSettingsService settings, IAuthorizationContext authorization) : ControllerBase
{
    [HttpGet("Fields")]
    public ActionResult<IReadOnlyList<UserSettingField>> GetFields() => Ok(UserModalConfiguration.Fields);

    [HttpGet]
    public async Task<ActionResult<UserSettingsResponse>> Get()
    {
        Guid userId = (await authorization.GetAuthorizationInfo(Request).ConfigureAwait(false)).UserId;
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(settings.Get(userId));
    }

    [HttpPut]
    public async Task<ActionResult<UserSettingsResponse>> Save(UserSettingsRequest request)
    {
        Guid userId = (await authorization.GetAuthorizationInfo(Request).ConfigureAwait(false)).UserId;
        if (userId == Guid.Empty)
        {
            return Unauthorized();
        }

        if (!settings.Save(userId, request.Overrides, out string? error))
        {
            return BadRequest(new { message = error });
        }

        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(settings.Get(userId));
    }
}
