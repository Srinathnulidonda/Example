
let map, service, directionsRenderer;
const markers = [];
let userMarker;
let weatherOverlay;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        mapTypeControl: false,
        fullscreenControl: true,
        streetViewControl: false,
        styles: [
            {
                featureType: "all",
                elementType: "labels.text.fill",
                stylers: [{ color: "#7c93a3" }, { lightness: -10 }]
            },
            {
                featureType: "administrative.country",
                elementType: "geometry",
                stylers: [{ visibility: "on" }]
            },
            {
                featureType: "landscape",
                elementType: "geometry.fill",
                stylers: [{ color: "#dde3e3" }]
            }
        ]
    });

    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: "#3498db",
            strokeWeight: 5
        }
    });
    directionsRenderer.setMap(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            map.setCenter(userLocation);

            userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#3498db',
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: '#ffffff'
                },
                title: 'Your Location'
            });

            navigator.geolocation.watchPosition((position) => {
                const newUserLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                userMarker.setPosition(newUserLocation);
                map.panTo(newUserLocation);
            });

        }, () => {
            handleLocationError(true, map.getCenter());
        });
    } else {
        handleLocationError(false, map.getCenter());
    }

    const input = document.getElementById('search-input');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
            alert("No details available for the selected place.");
            return;
        }
        map.panTo(place.geometry.location);
        map.setZoom(14);
        addMarker(place.geometry.location, place.name);
    });

    map.addListener('click', (event) => {
        addMarker(event.latLng);
    });

    createWeatherOverlay();
}

function handleLocationError(browserHasGeolocation, pos) {
    alert(browserHasGeolocation
        ? "Error: The Geolocation service failed."
        : "Error: Your browser doesn't support geolocation.");
    map.setCenter(pos);
}

function addMarker(location, title = 'Selected Location') {
    const marker = new google.maps.Marker({
        position: location,
        map: map,
        title: title,
        animation: google.maps.Animation.DROP,
        icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        }
    });
    markers.push(marker);
    if (markers.length > 1) {
        calculateShortestPath();
    }
    findNearbyPlaces(location);
    getWeather(location);

    
}

function calculateShortestPath() {
    if (markers.length < 2) {
        return;
    }
    const directionsService = new google.maps.DirectionsService();
    const travelMode = document.getElementById('travel-mode-select').value;

    const waypoints = markers.slice(1, -1).map(marker => ({
        location: marker.getPosition(),
        stopover: true,
    }));

    directionsService.route({
        origin: markers[0].getPosition(),
        destination: markers[markers.length - 1].getPosition(),
        waypoints: waypoints,
        travelMode: google.maps.TravelMode[travelMode],
    }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            displayDistanceAndDuration(result);
            updateMarkerIcons();
        } else {
            alert('Failed to calculate route: ' + status);
        }
    });
}
function calculateDistances() {
    if (markers.length < 2) {
        alert("Please select at least two places.");
        return;
    }
    
    const service = new google.maps.DistanceMatrixService();
    const origins = markers.map(marker => marker.getPosition());
    const destinations = [...origins];
    
    service.getDistanceMatrix({
        origins: origins,
        destinations: destinations,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
    }, (response, status) => {
        if (status !== 'OK') {
            alert('Error was: ' + status);
            return;
        }
        
        let shortestDistance = Infinity;
        let shortestRoute = [];
        
        const permutations = getPermutations([...Array(origins.length).keys()]);
        
        permutations.forEach(perm => {
            let totalDistance = 0;
            for (let i = 0; i < perm.length - 1; i++) {
                totalDistance += response.rows[perm[i]].elements[perm[i+1]].distance.value;
            }
            if (totalDistance < shortestDistance) {
                shortestDistance = totalDistance;
                shortestRoute = perm;
            }
        });
        
        displayShortestRoute(shortestRoute, response);
    });
}

function getPermutations(arr) {
    if (arr.length <= 2) return arr.length === 2 ? [arr, [arr[1], arr[0]]] : [arr];
    return arr.reduce((acc, item, i) =>
        acc.concat(getPermutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map(val => [item, ...val])),
    []);
}

function displayShortestRoute(route, response) {
    let result = "Shortest route:\n";
    let totalDistance = 0;
    let totalDuration = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
        const element = response.rows[route[i]].elements[route[i+1]];
        result += `${markers[route[i]].getTitle()} to ${markers[route[i+1]].getTitle()}: ${element.distance.text}\n`;
        totalDistance += element.distance.value;
        totalDuration += element.duration.value;
    }
    
    result += `\nTotal distance: ${(totalDistance / 1000).toFixed(2)} km`;
    result += `\nEstimated total duration: ${Math.round(totalDuration / 60)} minutes`;
    
    document.getElementById('result').innerHTML = result.replace(/\n/g, '<br>');
}
function updateMarkerIcons() {
    markers.forEach((marker, index) => {
        const label = (index + 1).toString();
        marker.setIcon({
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#e74c3c',
            fillOpacity: 0.9,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 10,
            labelOrigin: new google.maps.Point(0, 3.5)
        });
        marker.setLabel({
            text: label,
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold'
        });
    });
}

function displayDistanceAndDuration(result) {
    const route = result.routes[0];
    let totalDistance = 0;
    let totalDuration = 0;

    route.legs.forEach(leg => {
        totalDistance += leg.distance.value;
        totalDuration += leg.duration.value;
    });

    totalDistance = (totalDistance / 1000).toFixed(2);
    totalDuration = (totalDuration / 60).toFixed(2);

    document.getElementById('result').innerHTML = `
        <i class="fas fa-route"></i> Total Distance: ${totalDistance} km<br>
        <i class="fas fa-clock"></i> Total Duration: ${totalDuration} mins
    `;
}

function searchPlaces() {
    const query = document.getElementById('search-input').value;
    const type = document.getElementById('type-select').value;
    const minRating = document.getElementById('rating-select').value;

    if (!query) {
        alert("Please enter a search term.");
        return;
    }

    service = new google.maps.places.PlacesService(map);
    service.textSearch({
        query: query,
        type: type,
    }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = '';
            results.forEach(place => {
                if (place.geometry && place.geometry.location && (!minRating || place.rating >= parseFloat(minRating))) {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    resultItem.innerHTML = `
                        <h3>${place.name}</h3>
                        <p><i class="fas fa-star"></i> ${place.rating ? place.rating.toFixed(1) : 'N/A'}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${place.formatted_address}</p>
                    `;
                    resultItem.addEventListener('click', () => {
                        map.panTo(place.geometry.location);
                        map.setZoom(14);
                        addMarker(place.geometry.location, place.name);
                    });
                    resultsContainer.appendChild(resultItem);
                }
            });
        } else {
            alert('Search failed: ' + status);
        }
    });
}

function saveRoute() {
    const route = markers.map(marker => ({
        lat: marker.getPosition().lat(),
        lng: marker.getPosition().lng(),
        title: marker.getTitle()
    }));
    localStorage.setItem('savedRoute', JSON.stringify(route));
    alert('Route saved successfully!');
}

function loadRoute() {
    const savedRoute = JSON.parse(localStorage.getItem('savedRoute'));
    if (savedRoute && savedRoute.length > 0) {
        clearMarkers();
        savedRoute.forEach(point => {
            addMarker(new google.maps.LatLng(point.lat, point.lng), point.title);
        });
        calculateShortestPath();
    } else {
        alert('No saved route found.');
    }
}

function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers.length = 0;
    directionsRenderer.setDirections({routes: []});
}

function createWeatherOverlay() {
    weatherOverlay = new google.maps.ImageMapType({
        getTileUrl: function(coord, zoom) {
            return `https://tile.openweathermap.org/map/temp_new/${zoom}/${coord.x}/${coord.y}.png?appid=e597f0454b011ac1ad8a410141ca2ff6`;
        },
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 9,
        minZoom: 0,
        name: 'Weather'
    });
}

function toggleWeather() {
    const weatherSwitch = document.getElementById('weather-switch');
    if (weatherSwitch.checked) {
        map.overlayMapTypes.push(weatherOverlay);
    } else {
        map.overlayMapTypes.clear();
    }
}

function findNearbyPlaces(location) {
    const service = new google.maps.places.PlacesService(map);
    service.nearbySearch({
        location: location,
        radius: 500,
        type: ['point_of_interest']
    }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            for (let i = 0; i < Math.min(results.length, 5); i++) {
                const place = results[i];
                const marker = new google.maps.Marker({
                    position: place.geometry.location,
                    map: map,
                    title: place.name,
                    icon: {
                        url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }
                });
                
                const infoWindow = new google.maps.InfoWindow({
                    content: `
                        <div>
                            <h3>${place.name}</h3>
                            <p>${place.vicinity}</p>
                            <p>Rating: ${place.rating ? place.rating.toFixed(1) : 'N/A'}</p>
                        </div>
                    `
                });

                marker.addListener('click', () => {
                    infoWindow.open(map, marker);
                });
            }
        }
    });
}

window.onload = initMap;

function getWeather(location) {
    const apiKey = 'e597f0454b011ac1ad8a410141ca2ff6'; 
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat()}&lon=${location.lng()}&appid=${apiKey}&units=metric`;
    
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const weatherInfo = `
                <h3>Current Weather</h3>
                <p>Temperature: ${data.main.temp}°C</p>
                <p>Condition: ${data.weather[0].main}</p>
                <p>Humidity: ${data.main.humidity}%</p>
            `;
            document.getElementById('weather-info').innerHTML = weatherInfo;
        })
        .catch(error => {
            console.error('Error fetching weather:', error);
            document.getElementById('weather-info').innerHTML = 'Unable to fetch weather information.';
        });
}

map.addListener('click', (event) => {
    addMarker(event.latLng);
});

// Add a button to calculate distances
const calculateButton = document.createElement('button');
calculateButton.textContent = 'Calculate Shortest Route';
calculateButton.onclick = calculateDistances;
document.querySelector('.sidebar').appendChild(calculateButton);