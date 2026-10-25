/**
 * Cropland Dynamics 2003-2019
 * ---------------------------
 * Maps where cropland stayed, appeared or disappeared between 2003 and
 * 2019 using the GLAD global cropland maps (Potapov et al., 2022), and
 * reports the area of each change class for a region of interest.
 *
 * Outputs
 *   - Map layers: change classes, plus the 2003 / 2019 cropland masks.
 *   - Console table: stable / gain / loss area (km2) inside the ROI.
 *   - GeoTIFF export: a 3-band binary stack (Stable, Gain, Loss) and/or a
 *     single-band class map (1 = stable, 2 = gain, 3 = loss).
 *
 * How to run
 *   Paste into https://code.earthengine.google.com, edit CONFIG, press Run,
 *   then start the exports from the Tasks tab.
 *
 * Author: Parisa Abbasalizadehrezaei · https://risarezaei.github.io
 * License: MIT
 */

// =============================== CONFIG ===================================
var CONFIG = {
  // Region of interest. Use a drawn geometry, an asset, or a rectangle.
  // A smaller region gives faster area statistics and exports.
  roi: ee.Geometry.Rectangle([44.0, 36.5, 47.5, 38.8]),   // example region

  exportStack: true,      // 3-band binary GeoTIFF (Stable, Gain, Loss)
  exportClassMap: true,   // single-band class GeoTIFF (1/2/3)
  computeAreas: true,     // print area per class inside the ROI

  scale: 30,              // native resolution of the cropland maps (m)
  driveFolder: 'earthengine',
  filePrefix: 'cropland_dynamics_2003_2019'
};
// ==========================================================================

// ---- Inputs: GLAD global cropland extent (1 = cropland) ----------------
// unmask(0) makes non-cropland explicit, so "not cropland" is 0 rather than
// masked and the gain/loss logic below is evaluated everywhere.
var crop2003 = ee.ImageCollection('users/potapovpeter/Global_cropland_2003')
  .mosaic().gt(0).unmask(0).rename('crop2003');
var crop2019 = ee.ImageCollection('users/potapovpeter/Global_cropland_2019')
  .mosaic().gt(0).unmask(0).rename('crop2019');

// Only keep pixels that were cropland in at least one of the two years.
var everCrop = crop2003.or(crop2019);

// ---- Change classes ----------------------------------------------------
var stable = crop2003.and(crop2019).rename('Stable');
var gain   = crop2019.and(crop2003.not()).rename('Gain');
var loss   = crop2003.and(crop2019.not()).rename('Loss');

var stack = ee.Image.cat([stable, gain, loss]).updateMask(everCrop).toByte();

var classes = ee.Image(0)
  .where(stable, 1)
  .where(gain, 2)
  .where(loss, 3)
  .updateMask(everCrop)
  .rename('class')
  .toByte();

// ---- Map ---------------------------------------------------------------
var CLASS_VIS = {min: 1, max: 3, palette: ['2e7d32', '1e88e5', 'e53935']};
Map.centerObject(CONFIG.roi, 8);
Map.addLayer(crop2003.selfMask(), {palette: ['a5d6a7']}, 'Cropland 2003', false);
Map.addLayer(crop2019.selfMask(), {palette: ['81d4fa']}, 'Cropland 2019', false);
Map.addLayer(classes.clip(CONFIG.roi), CLASS_VIS, 'Cropland change 2003-2019');
Map.addLayer(ee.Image().paint(CONFIG.roi, 0, 2), {palette: ['ffffff']}, 'ROI');

// Legend
var legend = ui.Panel({style: {position: 'bottom-left', padding: '8px 12px'}});
legend.add(ui.Label('Cropland 2003 → 2019', {fontWeight: 'bold'}));
[['Stable', '2e7d32'], ['Gain', '1e88e5'], ['Loss', 'e53935']].forEach(function (c) {
  legend.add(ui.Panel([
    ui.Label('', {backgroundColor: '#' + c[1], padding: '8px', margin: '2px 6px 2px 0'}),
    ui.Label(c[0], {margin: '2px 0'})
  ], ui.Panel.Layout.Flow('horizontal')));
});
Map.add(legend);

// ---- Area statistics (km2) inside the ROI ------------------------------
if (CONFIG.computeAreas) {
  var areaKm2 = ee.Image.pixelArea().divide(1e6);
  var areas = stack.unmask(0).multiply(areaKm2).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: CONFIG.roi,
    scale: CONFIG.scale,
    maxPixels: 1e13,
    tileScale: 4
  });
  print('Cropland change area inside ROI (km2)', areas);
}

// ---- Exports -----------------------------------------------------------
if (CONFIG.exportStack) {
  Export.image.toDrive({
    image: stack.clip(CONFIG.roi),
    description: CONFIG.filePrefix + '_3bands',
    folder: CONFIG.driveFolder,
    fileNamePrefix: CONFIG.filePrefix + '_3bands',
    region: CONFIG.roi,
    scale: CONFIG.scale,
    crs: 'EPSG:4326',
    maxPixels: 1e13
  });
}
if (CONFIG.exportClassMap) {
  Export.image.toDrive({
    image: classes.clip(CONFIG.roi),
    description: CONFIG.filePrefix + '_classes',
    folder: CONFIG.driveFolder,
    fileNamePrefix: CONFIG.filePrefix + '_classes',
    region: CONFIG.roi,
    scale: CONFIG.scale,
    crs: 'EPSG:4326',
    maxPixels: 1e13
  });
}
