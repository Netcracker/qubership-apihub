create table csv_dashboard_publication(
    publish_id varchar,
    status varchar,
    message varchar,
    csv_report bytea,
    PRIMARY KEY(publish_id)
);