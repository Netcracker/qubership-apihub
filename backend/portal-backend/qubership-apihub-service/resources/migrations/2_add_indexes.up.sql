ALTER TABLE ONLY public.published_sources ADD CONSTRAINT published_sources_published_sources_archives_checksum_fk FOREIGN KEY (archive_checksum) REFERENCES public.published_sources_archives(checksum);


CREATE UNIQUE INDEX activity_tracking_transition_id_uindex ON public.activity_tracking_transition USING btree (id);
CREATE INDEX build_depends_index ON public.build_depends USING btree (depend_id);
CREATE INDEX build_status_index ON public.build USING btree (status);
CREATE INDEX operation_comparison_comparison_id_index ON public.operation_comparison USING btree (comparison_id);
CREATE INDEX package_transition_old_package_id_index ON public.package_transition USING btree (old_package_id);
CREATE UNIQUE INDEX published_sources_package_id_version_revision_uindex ON public.published_sources USING btree (package_id, version, revision);
CREATE INDEX ts_graphql_operation_data_idx ON public.ts_graphql_operation_data USING gin (scope_argument, scope_property, scope_annotation) WITH (fastupdate='true');
CREATE INDEX ts_operation_data_idx ON public.ts_operation_data USING gin (scope_all) WITH (fastupdate='true');
CREATE INDEX ts_rest_operation_data_idx ON public.ts_rest_operation_data USING gin (scope_request, scope_response, scope_annotation, scope_properties, scope_examples) WITH (fastupdate='true');
