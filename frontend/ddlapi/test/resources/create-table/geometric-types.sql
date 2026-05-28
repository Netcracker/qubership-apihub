CREATE TABLE geometric_shapes (
  id bigint PRIMARY KEY,
  pt point,
  ln line,
  seg lseg,
  bx box,
  pth path,
  poly polygon,
  cir circle
);
