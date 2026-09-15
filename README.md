<div align="center">

<div alt style="text-align: center; transform: scale(.25);">
	<picture>
		<source media="(prefers-color-scheme: dark)" srcset="https://github.com/varunaditya-plus/SleekFin/raw/main/assets/logo_dark.png" />
		<img alt="SleekFin Logo" src="https://github.com/varunaditya-plus/SleekFin/raw/main/assets/logo_light.png" style="width: 170px;" />
	</picture>
</div>

# SleekFin
![GitHub License](https://www.shieldcn.dev/github/license/varunaditya-plus/SleekFin.svg?variant=outline&size=sm)
[![GitHub Downloads (all assets, all releases)](https://shieldcn.dev/github/downloads/varunaditya-plus/SleekFin.svg?variant=outline&size=sm)](https://github.com/varunaditya-plus/SleekFin/releases/latest)
[![GitHub Release](https://shieldcn.dev/github/release/varunaditya-plus/SleekFin.svg?size=sm)](https://github.com/varunaditya-plus/SleekFin/releases/latest)
![Please star this repo](https://shieldcn.dev/badge/★%20please%20star-22c55e.svg?theme=amber&color=eab308&size=sm&variant=outline)

The ultimate customisation plugin for Jellyfin, which fully reskins Jellyfin to give it a modern, refreshed look. This plugin is like a superpowered theme, with precise customisation, letting you tweak the plugin as you'd like.

</div>

<!-- <div align="center" style="width:100%;">
  <video src="..."></video>
</div> -->

---

## Features

- **Complete reskin:** Applies a fully black interface with dark surfaces, red accents, and uses Inter across the main UI, dialogs, lists, and cards.
- **Floating header:** Turns Jellyfin's modern and legacy desktop/mobile headers into a custom compact navigation bar which can be customized in the plugin's UI Builder.
- **Configurable home hero:** Adds a full-width hero section above rows on the home page to display your library's content more nicely.
- **Redesigned home and library pages:** Restyles the carousels and library pages to show content more clearly with consistent spacing and concise info under posters.
- **Updated detail pages:** Redesigns Jellyfin's Movie, Series, Season, and Episode pages with full-page backdrop heroes, title art, and richer metadata. Disable the replacement in plugin settings to keep Jellyfin's native detail pages.
- **Upgraded cast and recommendations:** Restyles cast into a clean horizontal row and turns similar titles into a dedicated **You may like** section with backdrop/poster imagery, ratings, years, and media types.
- **Responsive layouts:** Adapts the header, hero, media rows, detail pages, controls, typography, and spacing across mobile, tablet, desktop, and ultrawide browser sizes.

## Installation

### First make sure you have these prerequisites:
- A running Jellyfin **12.0** instance
- [File Transformation](https://www.iamparadox.dev/jellyfin/plugins/manifest.json) plugin

### Install from plugin catalog
1. Open **Dashboard → Plugins → Manage Repositories**.
2. Click **New Repository** and paste this repository URL:
```
https://raw.githubusercontent.com/varunaditya-plus/SleekFin/main/manifest.json
```
3. Now, in the sidebar, go to **Plugins**, select **All** in the filters above the plugins, click SleekFin, and click **Install**.
4. Now you have to restart your Jellyfin instance. Go to **Dashboard** and click the **Restart** button. You're done!

### Configuration
After installation, go to **Dashboard → SleekFin**. The **Overview** tab contains the plugin's settings, including an option to keep Jellyfin's native detail pages while retaining the SleekFin header and hero. Refresh the Jellyfin web client after changing this option. **UI Builder** provides a live draggable header preview and controls for its branding, layout, sizing, colors, and states.

## Screenshots
<table>
  <tr>
    <td><img width="1720" height="720" alt="Home screen" src="https://github.com/user-attachments/assets/db8e2443-35f1-47d0-a734-c36cd41fd587" /></td>
  </tr>
  <tr>
	  <td><img width="1720" height="720" alt="Movie page" src="https://github.com/user-attachments/assets/c4fb2cef-969e-47f2-93cd-2db019179ddc" /></td>
  </tr>
  <tr>
    <td><img width="1720" height="720" alt="Series page" src="https://github.com/user-attachments/assets/28a00655-4b2a-46ef-99a0-6d8b8e111b22" /></td>
    <!-- <td><img width="1720" height="720" alt="Configuration page" src="" /></td> -->
  </tr>
</table>

## Downloads

<p align="center">
  <a href="https://downloadhistory.varunaditya.xyz/#varunaditya-plus/SleekFin&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://downloadhistory.varunaditya.xyz/svg?repos=varunaditya-plus/SleekFin&type=Date&title=&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://downloadhistory.varunaditya.xyz/svg?repos=varunaditya-plus/SleekFin&type=Date&title=" />
      <img alt="Download History Chart" src="https://downloadhistory.varunaditya.xyz/svg?repos=varunaditya-plus/SleekFin&type=Date&title=" width=600 />
    </picture>
  </a>
</p>

<!-- ## FAQ

<details><summary><b>Question</b></summary>

Answer

</details> -->


## Contributing & Support
If you have suggestions or features you'd like to be implemented into SleekFin, please open a pull request. For feature requests, suggestions, and bug reports, open an issue. Include your Jellyfin version and a screenshot if relevant.

See [CONTRIBUTING.md](CONTRIBUTING.md) for testing expectations, commit format, versioning, and PR guidelines.

Use [AGENTS.md](AGENTS.md) with your AI of choice to give it context on this codebase and how code should be written in PRs.

## Credits
- [Preact](https://preactjs.com/) by the Preact authors, licensed under MIT.
- [Inter](https://rsms.me/inter/) by Rasmus Andersson and the Inter Project Authors, under the SIL Open Font License 1.1.
- Interface icons adapted from [Lucide](https://lucide.dev/), licensed under ISC.
- Uses [File Transformation](https://github.com/IAmParadox27/jellyfin-plugin-file-transformation) by IAmParadox27.
