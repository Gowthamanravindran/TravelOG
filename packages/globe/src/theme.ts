// The globe's colours. Apart from this file nothing in the package needs the map library, so the
// app can read the colours without loading it.
export type GlobeTheme = {
  space: string; // behind the globe
  ocean: string; // used when imagery is off or still loading
  land: string; // same
  visited: string;
  border: string; // border colour in low quality
  pin: string;
  route: string;
  rim: string; // glowing outline around the globe, as 'r,g,b'
  tag?: string; // name tags and the country popup; default navy
  tagText?: string;
  /** False draws every star white (for a black and white theme). Default true. */
  starTints?: boolean;
};

export const defaultTheme: GlobeTheme = {
  space: '#050b1a',
  ocean: '#0d2f57',
  land: '#3f8463',
  visited: '#ff5a5f',
  border: '#0a2340',
  pin: '#ffd166',
  route: '#ffffff',
  rim: '56,152,255',
  tag: '#0b2239',
  tagText: '#ffffff',
  starTints: true,
};
