export type Coords = { lat: number; lng: number };

export function toGoogleMapsDirectionsUrl(dest: Coords): string {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", `${dest.lat},${dest.lng}`);
  url.searchParams.set("travelmode", "driving");
  return url.toString();
}

export function toGoogleMapsQueryUrl(dest: Coords): string {
  const url = new URL("https://www.google.com/maps/search/");
  url.searchParams.set("api", "1");
  url.searchParams.set("query", `${dest.lat},${dest.lng}`);
  return url.toString();
}

export function toAppleMapsDirectionsUrl(dest: Coords): string {
  const url = new URL("http://maps.apple.com/");
  url.searchParams.set("daddr", `${dest.lat},${dest.lng}`);
  url.searchParams.set("dirflg", "d");
  return url.toString();
}


