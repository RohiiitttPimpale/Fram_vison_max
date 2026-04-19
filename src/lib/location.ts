interface NominatimResponse {
  display_name?: string;
  address?: {
    city?: string;
    municipality?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    suburb?: string;
    city_district?: string;
    county?: string;
    state_district?: string;
    state?: string;
    country?: string;
  };
}

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    });
  });
};

export const extractLocation = async (): Promise<string> => {
  const position = await getCurrentPosition();
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  // Use administrative zoom so results prefer city/district labels over neighborhood-level names.
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=10&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to resolve location name");
  }

  const data = (await response.json()) as NominatimResponse;
  const address = data.address || {};

  const primary =
    address.city ||
    address.town ||
    address.municipality ||
    address.city_district ||
    address.county ||
    address.state_district ||
    address.village ||
    address.hamlet ||
    address.suburb;
  const parts = [primary, address.state, address.country].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  if (data.display_name) {
    const concise = data.display_name.split(",").slice(0, 3).join(",").trim();
    if (concise.length > 0) return concise;
  }

  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
};