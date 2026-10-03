using Jellyfin.Plugin.SleekFin.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.SleekFin.Controllers;

[ApiController]
[Route("SleekFin/Details")]
[Authorize]
public sealed class SleekFinDetailsController : ControllerBase
{
    [HttpGet("Settings")]
    public ActionResult GetSettings()
    {
        PluginConfiguration configuration = SleekFinPlugin.Instance.Configuration;
        Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
        return Ok(new
        {
            seasonPickerEnabled = configuration.DetailsSeasonPickerEnabled,
            trailerBackgroundEnabled = configuration.DetailsTrailerBackgroundEnabled
        });
    }
}
