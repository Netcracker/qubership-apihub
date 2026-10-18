package org.qubership.jdiff.resolve;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.qubership.jdiff.model.Gav;
import org.qubership.jdiff.resolve.oci.OciImagePuller;
import org.qubership.jdiff.resolve.oci.OciLayerMerger;
import org.qubership.jdiff.resolve.oci.RegistryOciImagePuller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Extracts an application JAR from an OCI image by pulling registry layers (daemonless).
 *
 * <p>Images follow the qubership-java-base layout (JAR under {@code /app}) or Quarkus fast-jar
 * ({@code /app/app}, {@code /app/lib}).
 */
public final class ContainerImageJarExtractor {

    private static final Logger LOG = LoggerFactory.getLogger(ContainerImageJarExtractor.class);

    private final Path workDir;
    private final OciImagePuller imagePuller;

    public ContainerImageJarExtractor(Path workDir) {
        this(workDir, new RegistryOciImagePuller());
    }

    ContainerImageJarExtractor(Path workDir, OciImagePuller imagePuller) {
        this.workDir = workDir;
        this.imagePuller = imagePuller;
    }

    /**
     * Pulls image layers, materializes {@code /app}, and returns a stable path to the subject JAR.
     */
    public Path extractJar(String imageReference, String jarPathInImage) throws JarResolutionException {
        return extractClasspath(imageReference, jarPathInImage, null).applicationJar();
    }

    /**
     * Pulls image layers, materializes {@code /app}, and inventories packaged library coordinates
     * from {@code pom.properties}. The application JAR is the Quarkus {@code app/*.jar} when
     * present; {@code quarkus-run.jar} is not used for analysis.
     */
    public ImageClasspath extractClasspath(String imageReference, String jarPathInImage, Gav declaredApplication)
            throws JarResolutionException {
        if (imageReference == null || imageReference.isBlank()) {
            throw new JarResolutionException("imageReference must not be blank");
        }
        Path extractRoot;
        try {
            Files.createDirectories(workDir);
            extractRoot = Files.createTempDirectory(workDir, "image-extract-");
        } catch (IOException e) {
            throw new JarResolutionException("Failed to create extract directory under " + workDir, e);
        }

        try {
            LOG.info("Pulling image {} (daemonless registry extract)", imageReference);
            OciLayerMerger merged = imagePuller.pullImage(imageReference);
            Path localApp = extractRoot.resolve("app");
            merged.writeAppDirectory(localApp);
            ImageClasspath classpath = ImageClasspathScanner.scan(localApp, jarPathInImage, declaredApplication);
            Path stableJar = extractRoot.resolve("subject.jar");
            Files.copy(classpath.applicationJar(), stableJar, StandardCopyOption.REPLACE_EXISTING);
            LOG.info("Extracted {} from image {} to {}", classpath.applicationJar().getFileName(),
                    imageReference, stableJar);
            return new ImageClasspath(stableJar, classpath.applicationGav(), classpath.packagedLibraries());
        } catch (IOException e) {
            throw new JarResolutionException("Failed to extract jar from image " + imageReference, e);
        }
    }
}
