package com.netcracker.qubership.apihub.javataskconsumer.debug;

import java.nio.file.Files;
import java.nio.file.Path;

final class RepoLayout {

    private RepoLayout() {
    }

    static Path locate() {
        Path dir = Path.of(System.getProperty("user.dir", ".")).toAbsolutePath().normalize();
        for (int i = 0; i < 8 && dir != null; i++) {
            if (isJtcRoot(dir)) {
                return dir;
            }
            Path nested = dir.resolve("qubership-apihub-java-task-consumer");
            if (isJtcRoot(nested)) {
                return nested;
            }
            if ("java-task-consumer".equals(name(dir)) && isJtcRoot(dir.getParent())) {
                return dir.getParent();
            }
            dir = dir.getParent();
        }
        throw new IllegalStateException(
                "Cannot find java-task-consumer repository root from user.dir="
                        + System.getProperty("user.dir"));
    }

    private static boolean isJtcRoot(Path dir) {
        return dir != null
                && Files.isRegularFile(dir.resolve("pom.xml"))
                && Files.isRegularFile(dir.resolve("java-task-consumer").resolve("pom.xml"));
    }

    private static String name(Path dir) {
        return dir == null || dir.getFileName() == null ? "" : dir.getFileName().toString();
    }
}
