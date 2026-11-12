'use strict';
buildSidebar();
sys.on('show-panel', (id) => show(id));
show(new URLSearchParams(location.search).get('panel') || 'wifi');
