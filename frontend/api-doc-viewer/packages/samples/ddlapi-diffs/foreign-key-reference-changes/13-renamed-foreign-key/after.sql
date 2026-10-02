CREATE TABLE public.target (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer,
  CONSTRAINT fk_t_target_new FOREIGN KEY (ref_id) REFERENCES public.target(id)
);
