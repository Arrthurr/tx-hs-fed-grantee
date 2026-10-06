// Controlled SDK boundary for recovery tests, not a geographic renderer.
// The real APIProvider, Map, marker and InfoWindow React components still run.
(() => {
  class Events {
    listeners = {};
    addListener(name, callback) {
      (this.listeners[name] ||= new Set()).add(callback);
      return { remove: () => this.listeners[name].delete(callback) };
    }
    emit(name, event) { this.listeners[name]?.forEach(callback => callback(event)); }
  }
  class LatLng {
    constructor(value) { this.value = value; }
    lat() { return this.value.lat; }
    lng() { return this.value.lng; }
    toJSON() { return this.value; }
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
    moveCamera(options) { this.setOptions(options); }
    panTo(center) { this.options.center = center; }
    setZoom(zoom) { this.options.zoom = zoom; }
    fitBounds() {}
  }
  class AdvancedMarkerElement extends Events {
    constructor() {
      super();
      this.element = document.createElement('button');
      this.dataset = this.element.dataset;
      this.element.addEventListener('click', () => this.emit('click', {}));
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
    Map, InfoWindow, Data, LatLng,
    Size: class { constructor(width, height) { this.width = width; this.height = height; } },
    marker: { AdvancedMarkerElement },
    Settings: { getInstance: () => ({}) },
    event: {
      addListener: (target, name, callback) => target.addListener(name, callback),
      clearInstanceListeners: target => { target.listeners = {}; },
      removeListener: listener => listener.remove(),
    },
    importLibrary: async name => name === 'marker' ? maps.marker : maps,
  });
  maps.__ib__();
})();
