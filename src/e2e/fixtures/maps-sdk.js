// Controlled SDK boundary for recovery tests, not a geographic renderer.
// The real APIProvider, Map, marker and InfoWindow React components still run.
(() => {
  class Events {
    listeners = {};
    addListener(name, callback) {
      (this.listeners[name] ||= new Set()).add(callback);
      return { remove: () => this.listeners[name]?.delete(callback) };
    }
    emit(name, event) { this.listeners[name]?.forEach(callback => callback(event)); }
  }
  class LatLng {
    // Accepts (literal) or (lat, lng), like the real SDK.
    constructor(value, lng) { this.value = typeof value === 'number' ? { lat: value, lng } : value; }
    lat() { return this.value.lat; }
    lng() { return this.value.lng; }
    toJSON() { return this.value; }
  }
  // Minimal bounds for MarkerClusterer cluster positions and fit-to-members.
  class LatLngBounds {
    constructor(sw, ne) { this.points = []; if (sw) this.extend(sw); if (ne) this.extend(ne); }
    extend(point) { this.points.push(point instanceof LatLng ? point.toJSON() : point); return this; }
    getCenter() {
      const lats = this.points.map(p => p.lat), lngs = this.points.map(p => p.lng);
      return new LatLng({ lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 });
    }
    toJSON() {
      const lats = this.points.map(p => p.lat), lngs = this.points.map(p => p.lng);
      return { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
    }
  }
  class Map extends Events {
    constructor(div, options) {
      super();
      this.div = div;
      this.options = options;
      div.setAttribute('role', 'region');
      div.setAttribute('aria-label', 'Map SDK test double');
      div.style.cssText = 'height:100%;background:#e9eef1;padding:100px 24px 24px;display:flex;flex-wrap:wrap;gap:20px;align-content:flex-start;align-items:flex-start;justify-content:center';
    }
    getDiv() { return this.div; }
    setOptions(options) { Object.assign(this.options, options); }
    getCenter() { return new LatLng(this.options.center); }
    getZoom() { return this.options.zoom; }
    getHeading() { return 0; }
    getTilt() { return 0; }
    getBounds() { return { toJSON: () => ({ north: 36, south: 25, east: -93, west: -107 }) }; }
    getProjection() { return {}; }
    getMapCapabilities() { return { isAdvancedMarkersAvailable: true }; }
    moveCamera(options) { this.setOptions(options); }
    panTo(center) { this.options.center = center; }
    setZoom(zoom) { this.options.zoom = zoom; this.emit('idle'); }
    // Records calls so tests can assert statewide framing. Not a projection:
    // any fit settles on a fixed statewide zoom.
    fitBounds(bounds, padding) {
      const literal = bounds instanceof LatLngBounds ? bounds.toJSON() : bounds;
      (window.__mapsSdkFitBoundsCalls ||= []).push({ bounds: literal, padding });
      this.options.center = { lat: (literal.north + literal.south) / 2, lng: (literal.east + literal.west) / 2 };
      this.options.zoom = 6;
      this.emit('idle');
    }
  }
  // MarkerClusterer copies OverlayView's prototype with for...in, so these
  // methods must be enumerable (plain assignments, not class methods).
  function OverlayView() {}
  OverlayView.prototype.setMap = function (map) {
    if (this.__overlayMap === map) return;
    if (this.__overlayMap) this.onRemove?.();
    this.__overlayMap = map;
    if (map) this.onAdd?.();
  };
  OverlayView.prototype.getMap = function () { return this.__overlayMap ?? null; };
  OverlayView.prototype.getProjection = function () { return {}; };
  OverlayView.prototype.getPanes = function () { return {}; };
  class AdvancedMarkerElement extends Events {
    constructor(options = {}) {
      super();
      this.element = document.createElement('button');
      this.dataset = this.element.dataset;
      this.element.addEventListener('click', () => { this.emit('click', {}); this.emit('gmp-click', {}); });
      Object.assign(this, options);
    }
    set map(map) { this._map = map; if (map) map.div.append(this.element); else this.element.remove(); }
    get map() { return this._map; }
    set content(content) { this._content = content; this.element.replaceChildren(content); }
    get content() { return this._content; }
    set title(title) { this.element.title = title; this.element.setAttribute('aria-label', title); }
    addEventListener(...args) { this.element.addEventListener(...args); }
    removeEventListener(...args) { this.element.removeEventListener(...args); }
  }
  class InfoWindow extends Events {
    setContent(content) { this.content = content; }
    setOptions() {}
    open({ map }) {
      this.div = document.createElement('div');
      this.div.setAttribute('role', 'dialog');
      this.div.style.cssText = 'position:absolute;right:20px;bottom:20px;background:white;padding:20px';
      this.div.append(this.content);
      map.div.append(this.div);
    }
    close() { this.div?.remove(); }
  }
  class Data extends Events {
    constructor({ map }) { super(); this.map = map; }
    addGeoJson(data) {
      this.element = document.createElement('button');
      this.element.textContent = data.features[0].properties.name + ' boundary (SDK double)';
      this.element.addEventListener('click', () => this.emit('click', { latLng: new LatLng({ lat: 31, lng: -99 }) }));
      this.map.div.append(this.element);
    }
    setMap(map) { this.map = map; if (!map) this.element?.remove(); }
    setStyle() {}
  }
  const maps = window.google.maps;
  Object.assign(maps, {
    Map, InfoWindow, Data, LatLng, LatLngBounds, OverlayView,
    Size: class { constructor(width, height) { this.width = width; this.height = height; } },
    marker: { AdvancedMarkerElement },
    Settings: { getInstance: () => ({}) },
    event: {
      addListener: (target, name, callback) => target.addListener(name, callback),
      clearInstanceListeners: target => { target.listeners = {}; },
      removeListener: listener => listener.remove(),
      trigger: (target, name, ...args) => target.emit?.(name, ...args),
    },
    importLibrary: async name => name === 'marker' ? maps.marker : maps,
  });
  maps.__ib__();
})();
