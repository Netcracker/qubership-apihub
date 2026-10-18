CREATE TABLE public.target (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES public.target(id)
);

CREATE INDEX idx_t_ref_id ON public.t (ref_id);
COMMENT ON INDEX public.idx_t_ref_id IS 'Speeds up lookups by target';
