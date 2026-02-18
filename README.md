<p align="center">
  <img src="img/Logo.png" alt="GISCraft Logo" width="100">
</p>

<h1 align="center">GISCraft WebGIS — Coordinate Tracker</h1>

<p align="center">
  <strong>Real-time interactive coordinate tracking with UTM &amp; TM3 (SRGI2013) conversion</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#live-demo">Live Demo</a> •
  <a href="#coordinate-systems">Coordinate Systems</a> •
  <a href="#references">References</a> •
  <a href="#license">License</a>
</p>

---

## Overview

**GISCraft WebGIS Coordinate Tracker** is a lightweight, browser-based mapping application that displays real-time coordinates as you navigate the map. It supports multiple coordinate formats including **Decimal Degrees (DD)**, **Degrees Minutes Seconds (DMS)**, **Universal Transverse Mercator (UTM)**, and **Indonesia's Transverse Mercator 3° (TM3) / SRGI2013** system.

Built entirely with client-side technologies — no server or backend required.

## Live Demo

🌐 **[Open WebGIS Coordinate Tracker →](https://indragiscraft.github.io/utmtm3maps/)**

> Replace `#` with the actual GitHub Pages URL after deployment.

## Features

- 🗺️ **Interactive Map** — Powered by [Leaflet.js](https://leafletjs.com/) with multiple basemap options (Streets, Satellite, Terrain, Dark)
- 📍 **Real-time Coordinate Display** — Live DD/DMS coordinates update on mouse movement (desktop) or map pan (mobile)
- 🔄 **UTM Conversion** — Automatic geographic-to-UTM and UTM-to-geographic conversion using [Proj4js](http://proj4js.org/)
- 🇮🇩 **TM3 / SRGI2013 Conversion** — Full support for Indonesia's 16 TM3 zones (EPSG:23830–23845) with forward and reverse conversion
- 🔍 **Smart Search** — Search by location name, lat/lng coordinates, UTM coordinates, or TM3 coordinates
- 📋 **Click & Copy** — Click anywhere on the map to view detailed coordinates and copy in DD, UTM, or TM3 format
- 📐 **Zone Overlays** — Toggle UTM World zones and TM3 Indonesia zones as map overlays
- 📱 **Responsive Design** — Fully functional on desktop and mobile devices
- 📡 **Geolocation** — "My Location" feature to quickly navigate to your current position

## Coordinate Systems

### UTM (Universal Transverse Mercator)

UTM is a global map projection system that divides the Earth into 60 zones, each 6° of longitude wide. Each zone uses a transverse Mercator projection to minimize distortion within that zone.

| Parameter | Value |
|---|---|
| Projection | Transverse Mercator |
| Zone width | 6° |
| Total zones | 60 (Zone 1–60) |
| Scale factor | 0.9996 |
| False Easting | 500,000 m |
| False Northing | 0 m (North) / 10,000,000 m (South) |
| Datum | WGS 84 |

### TM3 — SRGI2013 (Sistem Referensi Geospasial Indonesia)

TM3 is Indonesia's national coordinate system defined by BIG (Badan Informasi Geospasial). It uses a Transverse Mercator projection with 3° zone width, providing higher accuracy for mapping across the Indonesian archipelago.

| Parameter | Value |
|---|---|
| Projection | Transverse Mercator |
| Zone width | 3° |
| Total zones | 16 (Zone 46.2–54.1) |
| Scale factor | 0.9999 |
| False Easting | 200,000 m |
| False Northing | 1,500,000 m |
| Datum | SRGI2013 (based on ITRF2014) |
| EPSG codes | 9476–9494 (SRGI2013 UTM reference) |

**TM3 Zone Coverage:**

| Zone Code | EPSG | Central Meridian | Longitude Range |
|---|---|---|---|
| 46.2 | 9476 | 94.5° E | 93° – 96° E |
| 47.1 | 9487 | 97.5° E | 96° – 99° E |
| 47.2 | 9487 | 100.5° E | 99° – 102° E |
| 48.1 | 9488 | 103.5° E | 102° – 105° E |
| 48.2 | 9488 | 106.5° E | 105° – 108° E |
| 49.1 | 9489 | 109.5° E | 108° – 111° E |
| 49.2 | 9489 | 112.5° E | 111° – 114° E |
| 50.1 | 9490 | 115.5° E | 114° – 117° E |
| 50.2 | 9490 | 118.5° E | 117° – 120° E |
| 51.1 | 9491 | 121.5° E | 120° – 123° E |
| 51.2 | 9491 | 124.5° E | 123° – 126° E |
| 52.1 | 9492 | 127.5° E | 126° – 129° E |
| 52.2 | 9492 | 130.5° E | 129° – 132° E |
| 53.1 | 9493 | 133.5° E | 132° – 135° E |
| 53.2 | 9493 | 136.5° E | 135° – 138° E |
| 54.1 | 9494 | 139.5° E | 138° – 141° E |

> **⚠️ Disclaimer — EPSG Codes:**  
> The EPSG codes listed above (9476–9494) are the official **SRGI2013 UTM zone** codes registered in the EPSG dataset, mapped here to their corresponding TM3 zones for reference. As of the time of writing, **no dedicated EPSG codes have been registered specifically for TM3 (3° zones) under SRGI2013**. The previous DGN95 TM3 codes (EPSG:23830–23845) are now considered legacy. The projection parameters (scale factor, false easting/northing, central meridians) for TM3 remain the same; the primary difference lies in the underlying datum — DGN95 was based on ITRF1992, while SRGI2013 is based on ITRF2014 (epoch 2012.0).

## Tech Stack

| Technology | Purpose |
|---|---|
| [Leaflet.js](https://leafletjs.com/) | Interactive map rendering |
| [Proj4js](http://proj4js.org/) | Coordinate system transformations (UTM & TM3) |
| [Font Awesome](https://fontawesome.com/) | UI icons |
| [Nominatim](https://nominatim.openstreetmap.org/) | Geocoding / location search |
| Vanilla HTML/CSS/JS | No frameworks, no build tools required |

## References

### UTM (Universal Transverse Mercator)

- **NGA (National Geospatial-Intelligence Agency)** — Coordinate Systems  
  🔗 [https://earth-info.nga.mil/index.php?dir=coordsys&action=coordsys](https://earth-info.nga.mil/index.php?dir=coordsys&action=coordsys)

### TM3 / SRGI2013

- **BIG (Badan Informasi Geospasial)** — SRGI Online  
  🔗 [https://srgi.big.go.id/](https://srgi.big.go.id/)

- **BIG** — Single Coordinate Transformation Tool  
  🔗 [http://36.95.202.213:1340/#single_koordinat](http://36.95.202.213:1340/#single_koordinat)

- **Peraturan BIG Nomor 13 Tahun 2021** — *Sistem Referensi Geospasial Indonesia (SRGI)*  
  Regulation on Indonesia's Geospatial Reference System, defining the official TM3 projection parameters, datum (SRGI2013 based on ITRF2014), and zone specifications for national mapping and surveying.

## Important Notice

> ⚠️ **This project is NOT intended to be cloned, forked, or redistributed as a standalone product.**  
> It is shared publicly as a reference tool and educational resource.  
> If you wish to reference this work, please provide proper attribution to **GISCraft**.

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)** license.

[![CC BY-NC-ND 4.0](https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

This means you are free to **share** (copy and redistribute) the material, provided that you:
- **Give appropriate credit** to GISCraft
- **Do not use it for commercial purposes**
- **Do not distribute modified versions**

See the [LICENSE](LICENSE) file for full details.

---

<p align="center">
  Made with ❤️ by <strong>GISCraft</strong>
</p>

<p align="center">
  <a href="https://www.tiktok.com/@gis.craft">TikTok</a> •
  <a href="https://www.youtube.com/@giscraft">YouTube</a> •
  <a href="https://www.linkedin.com/company/giscraft">LinkedIn</a>
</p>
