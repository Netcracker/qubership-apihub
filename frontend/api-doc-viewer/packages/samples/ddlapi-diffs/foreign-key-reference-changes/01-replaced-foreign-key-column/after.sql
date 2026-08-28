CREATE TABLE public.target (
  code integer PRIMARY KEY
);

CREATE TABLE public.t (
  ref_id integer REFERENCES public.target(code)
);
