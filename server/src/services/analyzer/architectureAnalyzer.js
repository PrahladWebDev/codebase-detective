const LAYER_DIR_HINTS = {
  controllers: ['controller', 'controllers'],
  services: ['service', 'services'],
  models: ['model', 'models', 'entities', 'schema', 'schemas'],
  routes: ['route', 'routes', 'router', 'routers'],
  middleware: ['middleware', 'middlewares'],
  components: ['component', 'components'],
  views: ['view', 'views', 'pages'],
};

function dirsContain(paths, hints) {
  return paths.some((p) => {
    const segments = p.toLowerCase().split('/');
    return segments.some((seg) => hints.includes(seg));
  });
}

/**
 * Looks at the directory shape of the project (not file contents) to guess
 * which architectural pattern is in play, and flags one structural smell:
 * controllers that look like they're carrying heavy data-access logic.
 */
function analyzeArchitecture(fileRows) {
  const paths = fileRows.map((f) => f.path);

  const layers = {};
  for (const [layer, hints] of Object.entries(LAYER_DIR_HINTS)) {
    layers[layer] = dirsContain(paths, hints);
  }

  let detected = 'Undetermined';
  if (layers.controllers && layers.services && layers.models) {
    detected = 'Layered / MVC';
  } else if (layers.components && !layers.controllers) {
    detected = 'Frontend Component Architecture';
  } else if (layers.services && !layers.controllers) {
    detected = 'Service-based';
  } else {
    // Feature-based heuristic: many top-level dirs each containing mixed concerns
    const topDirs = new Set(paths.map((p) => p.split('/')[0]).filter(Boolean));
    if (topDirs.size > 4) detected = 'Feature-based';
  }

  const observations = [];
  if (layers.controllers && layers.services) {
    const controllerFiles = fileRows.filter((f) => f.path.toLowerCase().includes('controller'));
    const heavyControllers = controllerFiles.filter((f) => f.lines > 250 && f.imports <= 3);
    if (heavyControllers.length > 0) {
      observations.push({
        title: 'Controllers appear to contain significant business/data-access logic.',
        detail: 'Consider reviewing the service layer.',
        files: heavyControllers.map((f) => f.path),
      });
    }
  }

  return {
    detected,
    layers,
    observations,
  };
}

module.exports = { analyzeArchitecture };
