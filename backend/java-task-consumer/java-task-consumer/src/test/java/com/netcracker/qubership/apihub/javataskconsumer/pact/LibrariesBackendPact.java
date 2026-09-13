package com.netcracker.qubership.apihub.javataskconsumer.pact;

/**
 * Shared names for the JTC ↔ libraries-backend Pact. Provider verification must use the same
 * consumer/provider names and provider-state strings.
 */
public final class LibrariesBackendPact {

    public static final String CONSUMER = "java-task-consumer";
    public static final String PROVIDER = "libraries-backend";

    public static final String API_KEY = "test-api-key";
    public static final String BUILDER_ID = "builder-test-1";
    public static final String PACKAGE_ID = "demo-pkg";
    public static final String PUBLISH_ID = "pub-99";

    public static final String STATE_NO_TASKS = "no java build tasks are available";
    public static final String STATE_TASK_QUEUED =
            "a java-api-report task is queued for builder builder-test-1";
    public static final String STATE_PUBLISH_EXISTS =
            "java publish pub-99 exists for package demo-pkg";

    public static final String TASK_CONFIG_JSON = """
            {
              "publishId": "pub-99",
              "packageId": "demo-pkg",
              "buildType": "java-api-report",
              "metadata": {"gav": "com.example:lib:1.0.0"}
            }
            """;

    public static final String POLL_PATH = "/api/v2/java-builders/" + BUILDER_ID + "/tasks";
    public static final String STATUS_PATH =
            "/api/v3/packages/" + PACKAGE_ID + "/java-publish/" + PUBLISH_ID + "/status";

    /** Matches JTC's {@code multipart/form-data; boundary=...} header, any boundary value. */
    public static final String MULTIPART_CONTENT_TYPE_REGEX =
            "multipart/form-data;\\s*boundary=.+";

    private LibrariesBackendPact() {
    }
}
