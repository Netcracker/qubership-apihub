create table business_metric (
    year int not null,
    month int not null,
    day int not null,
    metric varchar not null,
    data jsonb,
    PRIMARY KEY(year, month, day, metric)
);