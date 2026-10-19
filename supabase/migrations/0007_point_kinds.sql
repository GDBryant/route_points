alter table points drop constraint points_kind_check;
alter table points add constraint points_kind_check
  check (kind in ('obstacle','start','end','poi','viewpoint','turn','hazard','camp','entrance','fuel','water','gate','parking','other'));
