package com.netcracker.qubership.apihub.javataskconsumer.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

public record WorkerConfig(
        String backendAddress,
        String apiKey,
        String builderId,
        long requestIntervalMs,
        long statusIntervalMs,
        int healthPort,
        Path workDir,
        Path japicmpJar,
        int workerThreads,
        Path mavenSettingsXml,
        List<String> mavenRepositories
) {

    public static WorkerConfig fromEnvironment() throws IOException {
        String backend = requireEnv("APIHUB_BACKEND_ADDRESS");
        String apiKey = readApiKey();
        String builderId = envOrDefault("JAVA_BUILDER_ID", UUID.randomUUID().toString());
        long requestInterval = Long.parseLong(envOrDefault("JOB_REQUEST_INTERVAL", "3000"));
        long statusInterval = Long.parseLong(envOrDefault("JOB_STATUS_INTERVAL", "5000"));
        int healthPort = Integer.parseInt(envOrDefault("HEALTH_PORT", "3000"));
        Path workDir = Path.of(envOrDefault("WORK_DIR", "/tmp/java-task-consumer"));
        Files.createDirectories(workDir);
        Path japicmpJar = Path.of(envOrDefault("JDIFF_JAPICMP_JAR", "/opt/jdiff/japicmp.jar"));
        int threads = Integer.parseInt(envOrDefault("JDIFF_THREADS", "4"));
        Path settingsXml = optionalPathEnv("JDIFF_SETTINGS_XML");
        List<String> repos = parseRepoList(System.getenv("JDIFF_MAVEN_REPOS"));
        return new WorkerConfig(
                backend,
                apiKey,
                builderId,
                requestInterval,
                statusInterval,
                healthPort,
                workDir,
                japicmpJar,
                threads,
                settingsXml,
                repos
        );
    }

    public String backendBaseUrl() {
        String host = backendAddress;
        if (!host.startsWith("http://") && !host.startsWith("https://")) {
            host = "http://" + host;
        }
        return host;
    }

    private static String readApiKey() throws IOException {
        String keyFile = System.getenv("APIHUB_API_KEY_FILE");
        if (keyFile != null && !keyFile.isBlank()) {
            return Files.readString(Path.of(keyFile)).trim();
        }
        String key = System.getenv("APIHUB_API_KEY");
        if (key == null || key.isBlank()) {
            throw new IllegalStateException("APIHUB_API_KEY or APIHUB_API_KEY_FILE is required");
        }
        return key.trim();
    }

    private static String requireEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " is required");
        }
        return value.trim();
    }

    private static String envOrDefault(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private static Path optionalPathEnv(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        return Path.of(value.trim());
    }

    private static List<String> parseRepoList(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
