alter table activity_tracking_transition add column completed_serial_number integer;
create sequence if not exists activity_tracking_transition_completed_seq as int minvalue 0 owned by activity_tracking_transition.completed_serial_number;
with completed_att as (
    select id from activity_tracking_transition 
    where status = 'complete'
    order by finished_at
)
update activity_tracking_transition att set completed_serial_number = nextval('activity_tracking_transition_completed_seq')
from completed_att c
where c.id = att.id;