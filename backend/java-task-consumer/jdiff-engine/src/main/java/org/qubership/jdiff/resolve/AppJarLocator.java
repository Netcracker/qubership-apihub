package org.qubership.jdiff.resolve;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

/**
 * Locates the application JAR under a copied {@code /app} directory from a qubership-java-base image.
 */
final class AppJarLocator {

    static final String DEFAULT_APP_DIR = "/app";

    private AppJarLocator() {
    }

    static Path locate(Path localAppDir, String jarPathInImage) throws JarResolutionException {
        if (!Files.isDirectory(localAppDir)) {
            throw new JarResolutionException("Application directory not found after image extract: " + localAppDir);
        }
        if (jarPathInImage != null && !jarPathInImage.isBlank()) {
            return resolveExplicit(localAppDir, jarPathInImage.trim());
        }
        return discoverSingleJar(localAppDir);
    }

    private static Path resolveExplicit(Path localAppDir, String jarPathInImage) throws JarResolutionException {
        Path candidate;
        if (jarPathInImage.startsWith("/")) {
            String relative = jarPathInImage.startsWith(DEFAULT_APP_DIR + "/")
                    ? jarPathInImage.substring(DEFAULT_APP_DIR.length() + 1)
                    : jarPathInImage.substring(1);
            candidate = localAppDir.resolve(relative).normalize();
        } else {
            candidate = localAppDir.resolve(jarPathInImage).normalize();
        }
        if (!candidate.startsWith(localAppDir.normalize())) {
            throw new JarResolutionException("jarPathInImage escapes /app: " + jarPathInImage);
        }
        if (!Files.isRegularFile(candidate)) {
            throw new JarResolutionException("JAR not found in image at " + jarPathInImage
                    + " (local path " + candidate + ")");
        }
        return candidate;
    }

    private static Path discoverSingleJar(Path localAppDir) throws JarResolutionException {
        List<Path> jars;
        try (Stream<Path> stream = Files.list(localAppDir)) {
            jars = stream
                    .filter(Files::isRegularFile)
                    .filter(p -> p.getFileName().toString().endsWith(".jar"))
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new JarResolutionException("Failed to list jars under " + localAppDir, e);
        }
        if (jars.isEmpty()) {
            throw new JarResolutionException("No .jar files found under " + DEFAULT_APP_DIR + " in image");
        }
        if (jars.size() > 1) {
            throw new JarResolutionException("Multiple jars under " + DEFAULT_APP_DIR
                    + "; specify jarPathInImage. Found: " + jars);
        }
        return jars.getFirst();
    }
}
