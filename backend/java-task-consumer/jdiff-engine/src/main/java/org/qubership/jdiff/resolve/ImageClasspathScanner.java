package org.qubership.jdiff.resolve;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.stream.Stream;
import org.qubership.jdiff.model.Gav;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Reads Maven coordinates from {@code pom.properties} under {@code META-INF/maven} inside JARs under a
 * materialized {@code /app} directory.
 */
final class ImageClasspathScanner {

    private static final Logger LOG = LoggerFactory.getLogger(ImageClasspathScanner.class);
    private static final String RUNNER_JAR = "quarkus-run.jar";

    private ImageClasspathScanner() {
    }

    static ImageClasspath scan(Path appDir, String jarPathInImage, Gav declaredApplication)
            throws JarResolutionException {
        Path applicationJar = locateApplicationJar(appDir, jarPathInImage);
        List<Gav> applicationCoordinates = readPomProperties(applicationJar);
        Gav applicationGav = applicationCoordinates.isEmpty()
                ? declaredApplication
                : applicationCoordinates.getFirst();

        Map<String, ResolvedDependency> libraries = new LinkedHashMap<>();
        try (Stream<Path> walk = Files.walk(appDir)) {
            List<Path> jars = walk
                    .filter(Files::isRegularFile)
                    .filter(path -> path.getFileName().toString().endsWith(".jar"))
                    .filter(path -> !RUNNER_JAR.equals(path.getFileName().toString()))
                    .toList();
            for (Path jar : jars) {
                for (Gav gav : readPomProperties(jar)) {
                    if (applicationGav != null && applicationGav.ga().equals(gav.ga())) {
                        continue;
                    }
                    libraries.putIfAbsent(gav.ga(), new ResolvedDependency(gav, "runtime", false, 0));
                }
            }
        } catch (IOException e) {
            throw new JarResolutionException("Failed to scan jars under " + appDir, e);
        }

        LOG.info("Image classpath: application={} libraries={}", applicationJar.getFileName(), libraries.size());
        return new ImageClasspath(applicationJar, applicationGav, List.copyOf(libraries.values()));
    }

    private static Path locateApplicationJar(Path appDir, String jarPathInImage) throws JarResolutionException {
        Path quarkusAppDir = appDir.resolve("app");
        if (Files.isDirectory(quarkusAppDir)) {
            List<Path> appJars;
            try (Stream<Path> stream = Files.list(quarkusAppDir)) {
                appJars = stream
                        .filter(Files::isRegularFile)
                        .filter(path -> path.getFileName().toString().endsWith(".jar"))
                        .sorted()
                        .toList();
            } catch (IOException e) {
                throw new JarResolutionException("Failed to list Quarkus app jars under " + quarkusAppDir, e);
            }
            if (appJars.size() == 1) {
                return appJars.getFirst();
            }
            if (appJars.size() > 1) {
                throw new JarResolutionException("Multiple jars under /app/app; specify jarPathInImage. Found: "
                        + appJars);
            }
        }
        return AppJarLocator.locate(appDir, runnerPath(jarPathInImage) ? null : jarPathInImage);
    }

    private static boolean runnerPath(String jarPathInImage) {
        if (jarPathInImage == null || jarPathInImage.isBlank()) {
            return false;
        }
        Path name = Path.of(jarPathInImage).getFileName();
        return name != null && RUNNER_JAR.equals(name.toString());
    }

    private static List<Gav> readPomProperties(Path jar) {
        if (!Files.isRegularFile(jar)) {
            return List.of();
        }
        List<Gav> coordinates = new ArrayList<>();
        try (JarFile jarFile = new JarFile(jar.toFile())) {
            Enumeration<JarEntry> entries = jarFile.entries();
            while (entries.hasMoreElements()) {
                JarEntry entry = entries.nextElement();
                if (!isPomProperties(entry.getName())) {
                    continue;
                }
                try (InputStream in = jarFile.getInputStream(entry)) {
                    Properties properties = new Properties();
                    properties.load(in);
                    String groupId = properties.getProperty("groupId");
                    String artifactId = properties.getProperty("artifactId");
                    String version = properties.getProperty("version");
                    if (blank(groupId) || blank(artifactId) || blank(version)) {
                        continue;
                    }
                    coordinates.add(new Gav(groupId.trim(), artifactId.trim(), version.trim(), null));
                }
            }
        } catch (IOException e) {
            LOG.debug("No Maven coordinates in {}: {}", jar.getFileName(), e.getMessage());
        }
        return coordinates;
    }

    private static boolean isPomProperties(String entryName) {
        return entryName.startsWith("META-INF/maven/") && entryName.endsWith("/pom.properties");
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
