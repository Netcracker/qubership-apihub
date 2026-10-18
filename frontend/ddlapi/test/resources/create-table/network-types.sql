CREATE TABLE network_info (
  id bigint PRIMARY KEY,
  ip_addr inet,
  network cidr,
  mac_addr macaddr,
  mac_addr8 macaddr8
);
