import DataLoader from 'dataloader';

const byId = (rows, ids) => {
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => rowsById.get(id) ?? null);
};

const groupByTourId = (rows, tourIds) => {
  const rowsByTourId = new Map();

  for (const row of rows) {
    const groupedRows = rowsByTourId.get(row.tour_id) ?? [];
    groupedRows.push(row);
    rowsByTourId.set(row.tour_id, groupedRows);
  }

  return tourIds.map((tourId) => rowsByTourId.get(tourId) ?? []);
};

export const createLoaders = (query) => ({
  userById: new DataLoader(async (ids) => {
    const { rows } = await query('select * from users where id = any($1)', [ids]);
    return byId(rows, ids);
  }),

  guideById: new DataLoader(async (ids) => {
    const { rows } = await query('select * from guides where id = any($1)', [ids]);
    return byId(rows, ids);
  }),

  photosByTourId: new DataLoader(async (tourIds) => {
    const { rows } = await query('select * from photos where tour_id = any($1)', [tourIds]);
    return groupByTourId(rows, tourIds);
  }),

  logsByTourId: new DataLoader(async (tourIds) => {
    const { rows } = await query(
      'select * from tour_logs where tour_id = any($1) order by recorded_at',
      [tourIds],
    );
    return groupByTourId(rows, tourIds);
  }),
});