CREATE TABLE public.target (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer,
  other_ref_id integer,
  CONSTRAINT fk_t_target_kept FOREIGN KEY (ref_id) REFERENCES public.target(id),
  CONSTRAINT fk_t_target_moved FOREIGN KEY (ref_id) REFERENCES public.target(id)
);
