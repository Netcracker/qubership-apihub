package org.qubership.jdiff.resolve;

import java.nio.file.Path;
import java.util.Optional;
import org.qubership.jdiff.model.Gav;

/**
 * Subject JAR taken from a container image (qubership-java-base layout: {@code /app/*.jar}, or
 * Quarkus fast-jar under {@code /app/app} plus {@code /app/lib}).
 *
 * <p>Upgrade-impact inventories library versions from {@code pom.properties} in the image. Optional
 * {@link #coordinateForPom()} is only a report label; Maven is not used to resolve the subject's POM.
 */
public final class DockerImageJarSource implements JarSource {

    private final String imageReference;
    private final String jarPathInImage;
    private final Gav coordinateForPom;

    public DockerImageJarSource(String imageReference, String jarPathInImage) {
        this(imageReference, jarPathInImage, null);
    }

    public DockerImageJarSource(String imageReference, String jarPathInImage, Gav coordinateForPom) {
        this.imageReference = imageReference;
        this.jarPathInImage = jarPathInImage;
        this.coordinateForPom = coordinateForPom;
    }

    public String imageReference() {
        return imageReference;
    }

    public String jarPathInImage() {
        return jarPathInImage;
    }

    public Optional<Gav> coordinateForPom() {
        return Optional.ofNullable(coordinateForPom);
    }

    @Override
    public Path resolve(ArtifactResolver resolver) {
        throw new UnsupportedOperationException(
                "Use JarSourceResolver or resolve(ContainerImageJarExtractor) for docker subjects");
    }

    Path resolve(ContainerImageJarExtractor extractor) throws JarResolutionException {
        return extractor.extractJar(imageReference, jarPathInImage);
    }

    ImageClasspath resolveClasspath(ContainerImageJarExtractor extractor) throws JarResolutionException {
        return extractor.extractClasspath(imageReference, jarPathInImage, coordinateForPom);
    }
}
