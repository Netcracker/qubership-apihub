alter table linted_document
    drop constraint linted_document_pk;

delete from linted_document where ruleset_id in (select id from ruleset where linter='ai_linter');
delete from document_lint_task where ruleset_id in (select id from ruleset where linter='ai_linter');
delete from lint_file_result where ruleset_id in (select id from ruleset where linter='ai_linter');
delete from ruleset_activation_history where ruleset_id in (select id from ruleset where linter='ai_linter');

delete from linted_document where ruleset_id in (select id from ruleset where api_type='asyncapi-3-0');
delete from document_lint_task where ruleset_id in (select id from ruleset where api_type='asyncapi-3-0');
delete from lint_file_result where ruleset_id in (select id from ruleset where api_type='asyncapi-3-0');
delete from ruleset_activation_history where ruleset_id in (select id from ruleset where api_type='asyncapi-3-0');

alter table linted_document
    add constraint linted_document_pk
        primary key (package_id, version, revision, file_id);

delete from ruleset_activation_history where ruleset_id='c6a9b817-10c7-4f59-8a2b-8f3eebe95929';
delete from ruleset_activation_history where ruleset_id='d417c9c7-77d4-4f8a-b4a1-6231a1d8a885';
delete from ruleset_activation_history where ruleset_id='de66b276-b5b2-416f-a94b-5b01e7d40c84';

delete from ruleset_activation_history where ruleset_id='e5142acd-82ee-4e69-abe6-f1a2db330b0e';


delete from ruleset where id='c6a9b817-10c7-4f59-8a2b-8f3eebe95929';
delete from ruleset where id='d417c9c7-77d4-4f8a-b4a1-6231a1d8a885';
delete from ruleset where id='de66b276-b5b2-416f-a94b-5b01e7d40c84';

delete from ruleset where id='e5142acd-82ee-4e69-abe6-f1a2db330b0e';

alter table document_lint_task
    drop column recalculate;

alter table version_lint_task
    drop column recalculate;
