"use strict";

// API and map settings
const RAPIDAPI_KEY = "4fa60c4c20mshc21098ba020e6d2p1a5b1djsn2ce828bd99b9";
const GEOCODE_HOST = "forward-reverse-geocoding.p.rapidapi.com";
const GEOCODE_URL = "https://" + GEOCODE_HOST + "/v1/forward";
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// GET request that returns parsed JSON
function requestJson(url, headers, onSuccess, onError) {
  const xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  xhr.timeout = 10000;
  Object.keys(headers).forEach((name) => xhr.setRequestHeader(name, headers[name]));

  // check status, then parse JSON
  xhr.onload = () => {
    if (xhr.status < 200 || xhr.status >= 300) {
      onError("HTTP " + xhr.status);
      return;
    }
    let data;
    try {
      data = JSON.parse(xhr.responseText);
    } catch (e) {
      onError("Μη έγκυρη JSON απάντηση");
      return;
    }
    onSuccess(data);
  };
  xhr.onerror = () => onError("Αποτυχία δικτύου");
  xhr.ontimeout = () => onError("Λήξη χρόνου αναμονής");

  xhr.send();
}

// check if a place is in Greece
function isInGreece(place) {
  if (place.address && place.address.country_code) {
    return place.address.country_code.toLowerCase() === "gr";
  }
  return /greece|ελλάδα/i.test(place.display_name || "");
}

// turn API response into an array of places
function toPlaceList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if ("lat" in data && "lon" in data) return [data];
    if (Object.keys(data).length === 0) return [];
  }
  return null;
}

// find address coordinates via geocoding API
function findLocation(country, city, street, onResult, onError) {
  const params = new URLSearchParams({
    street: street.trim(),
    city: city.trim(),
    country: country.trim(),
    format: "json",
    addressdetails: "1",
    "accept-language": "en",
  });
  const headers = {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": GEOCODE_HOST,
  };

  // send request and check the result
  requestJson(GEOCODE_URL + "?" + params.toString(), headers, (data) => {
    const places = toPlaceList(data);
    if (places === null) {
      onError("Μη αναμενόμενη απάντηση από την υπηρεσία");
      return;
    }
    if (places.length === 0) {
      onResult({ status: "empty" });
      return;
    }
    const place = places[0];
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    if (isNaN(lat) || isNaN(lon)) {
      onError("Μη αναμενόμενη απάντηση από την υπηρεσία");
      return;
    }
    if (!isInGreece(place)) {
      onResult({ status: "notGreece" });
      return;
    }
    onResult({ status: "found", lat: lat, lon: lon, displayName: place.display_name });
  }, onError);
}

// create Leaflet map
function createMap(container, location, zoom) {
  const map = L.map(container).setView([location.lat, location.lon], zoom || 16);
  L.tileLayer(TILE_URL, {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  return map;
}

// add marker with popup
function addMarker(map, location, popupText) {
  const marker = L.marker([location.lat, location.lon]).addTo(map);
  if (popupText) marker.bindPopup(popupText);
  return marker;
}

// remove map and its container
function destroyMap(map, container) {
  map.remove();
  container.remove();
}