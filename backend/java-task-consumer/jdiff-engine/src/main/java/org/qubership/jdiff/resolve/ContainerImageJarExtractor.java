package org.qubership.jdiff.resolve;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import org.qubership.jdiff.resolve.oci.OciImagePuller;
import org.qubership.jdiff.resolve.oci.OciLayerMerger;
import org.qubership.jdiff.resolve.oci.RegistryOciImagePuller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Extracts an application JAR from an OCI image by pulling registry layers (daemonless).
 *
 * <p>Images are expected to follow the qubership-java-base layout: application JAR under {@code /app}.
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
            Path jar = AppJarLocator.locate(localApp, jarPathInImage);
            Path stableJar = extractRoot.resolve("subject.jar");
            Files.copy(jar, stableJar, StandardCopyOption.REPLACE_EXISTING);
            LOG.info("Extracted {} from image {} to {}", jar.getFileName(), imageReference, stableJar);
            return stableJar;
        } catch (IOException e) {
            throw new JarResolutionException("Failed to extract jar from image " + imageReference, e);
        }
    }
}
