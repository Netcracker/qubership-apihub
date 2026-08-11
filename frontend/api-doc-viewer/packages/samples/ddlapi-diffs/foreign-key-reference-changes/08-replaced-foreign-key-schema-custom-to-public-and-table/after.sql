CREATE TABLE public.target_new (
  id integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES public.target_new(id)
);
