CREATE TABLE public.target_old (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES public.target_old(id)
);
