using Jellyfin.Plugin.SleekFin.Configuration;
using Jellyfin.Plugin.SleekFin.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.SleekFin;

public sealed class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<Func<PluginConfiguration>>(_ => () => SleekFinPlugin.Instance.Configuration);
        serviceCollection.AddSingleton<UserSettingsService>();
    }
}
