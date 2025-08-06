# 🌾 Cropland Dynamics Mapping (2003–2019) using Google Earth Engine

 ## Overview

 This Earth Engine script analyzes global cropland changes between 2003 and 2019 using Potapov et al.'s global cropland datasets. It identifies stable cropland areas, gains (areas that became cropland), and losses (areas that ceased to be cropland). The final output includes a visual RGB map and a 3-band binary raster representing cropland dynamics, exported as a GeoTIFF.

---
## Code Explanation

### **Step 1: Load Required Cropland Datasets**
We begin by loading the cropland images from Earth Engine assets for the years 2003 and 2019. These are provided as ImageCollections and are converted into single mosaicked images:
```javascript
var crop2003 = ee.ImageCollection("users/potapovpeter/Global_cropland_2003").mosaic();
var crop2019 = ee.ImageCollection("users/potapovpeter/Global_cropland_2019").mosaic();
```
### **Step 2: Create a Valid Mask**
We define a mask to include only the areas that were cropland in either 2003 or 2019. This step filters out non-cropland areas entirely from the analysis.
```javascript
var mask = crop2003.add(crop2019).gt(0);
```
### **Step 3: Detect Cropland Change Categories**
Three binary rasters are created:
* _Stable_: Areas with cropland in both 2003 and 2019.
* _Gain_: Areas that were not cropland in 2003 but became cropland in 2019.
* _Loss_: Areas that were cropland in 2003 but not in 2019.

Each binary image is masked using the valid cropland area:
```javascript
var stable = crop2003.and(crop2019).updateMask(mask).rename('Stable');
var gain   = crop2019.and(crop2003.not()).updateMask(mask).rename('Gain');
var loss   = crop2003.and(crop2019.not()).updateMask(mask).rename('Loss');
```
### **Step 4: Combine Bands into a Single Multi-Band Image**
The _stable_, _gain_, and _loss_ layers are stacked together into a single 3-band image for processing and export:
```javascript
var dynamicsStack = ee.Image.cat([stable, gain, loss]);
```
### **Step 5: Create an RGB Visualization Layer (Optional)**
For easier visual inspection, we construct an RGB visualization where:
* _Red_ = Loss
* _Green_ = Stable
* _Blue_ = Gain

This RGB image is for display only and is not exported:
```javascript
var rgbVis = ee.Image.cat([
  loss.multiply(255),    
  stable.multiply(255),  
  gain.multiply(255)     
]).visualize({min: 0, max: 255});
```
Display the RGB visualization and the original 3-band image:
```javascript
Map.setCenter(0, 20, 2);  // Center the map at equator for a global view
Map.addLayer(rgbVis, {}, 'RGB Cropland Dynamics');
Map.addLayer(dynamicsStack, 
             {bands: ['Stable', 'Gain', 'Loss'], min: 0, max: 1}, 
             '3-Band Binary Dynamics');
```
### **Step 6: Export the 3-Band Raster** 
The final step exports the 3-band binary image as a GeoTIFF to Google Drive. This image can be further processed in GIS software such as QGIS or ArcGIS.
```javascript
Export.image.toDrive({
  image: dynamicsStack,
  description: 'Cropland_Dynamics_3Bands',
  folder: 'EarthEngine',
  fileNamePrefix: 'cropland_dynamics_2003_2019_3bands',
  scale: 30,
  region: ee.Geometry.Rectangle([-180, -88, 180, 88]),  // Nearly global extent
  maxPixels: 1e13
});
```
---
💡 Notes

The image scale of 30 meters matches Landsat resolution.

The RGB visualization is not used in the export; it is meant for visual inspection on the Earth Engine interface.

The mask ensures the analysis is limited to locations where cropland existed in either year, making the dynamics map more meaningful.

---
📂 Output Files

cropland_dynamics_2003_2019_3bands.tif: A 3-band GeoTIFF containing:

* _Band 1_: Stable (1 = cropland in both years, 0 = otherwise)

* _Band 2_: Gain (1 = gained cropland, 0 = otherwise)

* _Band 3_: Loss (1 = lost cropland, 0 = otherwise)
---









