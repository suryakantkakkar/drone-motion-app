import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { environment } from '../../environments/environment';
import * as turf from '@turf/turf';
import { LngLat } from 'mapbox-gl';

type Units = 'meters' | 'kilometers' | 'miles' | 'feet' | 'nauticalmiles' | 'degrees' | 'radians';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map!: mapboxgl.Map;
  droneMarker!: mapboxgl.Marker;
  dronePath!: turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties>;

  ngOnInit() {
    this.initializeMap();
  }

  initializeMap() {
    (mapboxgl as any).accessToken = environment.mapbox.accessToken;
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [0, 0],
      zoom: 1
    });
  }
  startLng!: number;
  startLat!: number;
   endLng!: number;
    endLat!: number;
    duration!: number;

  simulateDroneMotion(
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number,
    duration: number
  ) {
    if (!startLng || !startLat || !endLng || !endLat || !duration) {
      return; // Return if any input is missing
    }
    
    const coordinates: turf.helpers.Position[] = [
      [startLng, startLat],
      [endLng, endLat]
    ];
    const startCoordinates: LngLat = new LngLat(startLng, startLat);
    this.map.flyTo({
      center: startCoordinates,
      zoom: 7, // Adjust the zoom level as needed
      duration: 1000 // Adjust the duration as needed
    });
    const options: Units = 'miles'; // Adjust units if needed
    const distance = turf.distance(coordinates[0], coordinates[1], { units: options });
    const speed = distance / duration;

    this.dronePath = turf.lineString(coordinates) as turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties>;

    if (this.droneMarker) {
      this.droneMarker.remove();
    }

    this.droneMarker = new mapboxgl.Marker().setLngLat(coordinates[0] as [number, number]).addTo(this.map);

    let startTime = Date.now();
    let currentTime, progress;

    const animateMarker = () => {
      currentTime = Date.now();
      progress = (currentTime - startTime) / (duration * 1000);
    
      if (progress < 1) {
        const currentLngLat = turf.along(this.dronePath, speed * progress, { units: options });
        this.droneMarker.setLngLat(currentLngLat.geometry.coordinates as [number, number]);
        this.map.setCenter(currentLngLat.geometry.coordinates as [number, number]);
        
        // Adjust the zoom level and bearing to fit your requirements
        console.log(currentLngLat);
        currentLngLat.geometry.coordinates[0]=currentLngLat.geometry.coordinates[0]-0.013;
        currentLngLat.geometry.coordinates[1]= currentLngLat.geometry.coordinates[1]-0.013;
        this.map.jumpTo({
          center: currentLngLat.geometry.coordinates as [number, number],
          zoom: 15, // Adjust the zoom level as needed
          bearing: 0 // Adjust the bearing as needed
        });
       
        requestAnimationFrame(animateMarker);
      } else {
        this.droneMarker.setLngLat(coordinates[1] as [number, number]);
        this.map.setCenter(coordinates[1] as [number, number]);

        coordinates[1][0]=coordinates[1][0]-0.013;
        coordinates[1][1]=coordinates[1][1]-0.013;
        this.map.jumpTo({
          center: coordinates[1] as [number, number],
          zoom: 4, // Adjust the zoom level as needed
          bearing: 0 // Adjust the bearing as needed
        });
         
        if (this.map.getSource('dronePathSource')) {
          this.map.removeLayer('dronePathLayer');
          this.map.removeSource('dronePathSource');
        }
        this.droneMarker.remove();
        const pathCoordinates: number[][] = this.dronePath.geometry.coordinates;
  const pathLine: turf.helpers.LineString = {
    type: 'LineString',
    coordinates: pathCoordinates
  };

  const pathFeature: turf.helpers.Feature<turf.helpers.LineString, turf.helpers.Properties> = {
    type: 'Feature',
    properties: {},
    geometry: pathLine
  };

  this.map.addSource('dronePathSource', {
    type: 'geojson',
    data: pathFeature
  });

  this.map.addLayer({
    id: 'dronePathLayer',
    type: 'line',
    source: 'dronePathSource',
    paint: {
      'line-color': '#FF0000',
      'line-width': 2
    }
  });
        
      }
    };
    
    animateMarker();
  }
}
