'use strict';
(async () => {
  const s = await cdb.state();
  S.recent = s.recent;
  await onDb(s.info);
})();
